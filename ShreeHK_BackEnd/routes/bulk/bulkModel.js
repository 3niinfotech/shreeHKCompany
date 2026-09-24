const XLSX = require("xlsx");
const connection = require("../../connection.js");
const helper = require("../../helper.js");
const { logBulkRowAudit } = require("../../services/auditIntegration.js");

async function auditBulkStoneRow({ recordId, sku, oldValue, newValue, description }) {
  try {
    await logBulkRowAudit({
      actionType: "UPDATE",
      moduleName: "Diamond Stock",
      recordId,
      recordReference: sku,
      oldValue,
      newValue,
      description,
    });
  } catch (e) {
    console.error("bulk audit:", e);
  }
}

class BulkModel {
  constructor(companyId = helper.DEFAULT_COMPANY_ID) {
    this.table_product = "dai_product";
    this.table_product_value = "dai_product_value";
    this.companyId = Number(companyId) || helper.DEFAULT_COMPANY_ID;
  }

  async getDetailBySku(sku, q = null) {
    const sql = `SELECT * FROM ${this.table_product} WHERE company=? AND visibility=1 AND sku LIKE ${connection.escape(
      sku
    )}`;
    const rows = q ? await q(sql, [this.companyId]) : await helper.query(sql, [this.companyId]);
    return rows.length > 0 ? rows[0] : {};
  }

  async importData(type, inputFile) {
    await helper.getAttribute(1);

    const wb = Buffer.isBuffer(inputFile) ? XLSX.read(inputFile, { type: "buffer" }) : XLSX.readFile(inputFile);
    if (!wb || !Array.isArray(wb.SheetNames) || wb.SheetNames.length === 0) {
      return "Invalid file data.";
    }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      return "Invalid file data.";
    }
    const allDataInSheet = XLSX.utils.sheet_to_json(sheet, { header: "A", defval: "" });
    const arrayCount = allDataInSheet.length;

    return helper.runInTransaction(async (q) => {
      let rs = 1;
      const skuarr = [];
      const spid = [];

      if (type === "price") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const price = row.B != null ? String(row.B).trim() : "";
          const cost = row.C != null ? String(row.C).trim() : "";
          const rap = row.D != null ? String(row.D).trim() : "";
          if (!sku) continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          skuarr.push(sku);
          spid.push(data.id);
          const oldPrice = data.price;
          const oldRap = data.rap_price;

          if (price !== "") {
            const numPrice = parseFloat(price) || 0;
            const numCost = parseFloat(cost) || 0;
            const amount = parseFloat(data.polish_carat || 0) * numPrice;
            let sql = "";
            if (cost === "") {
              sql = `UPDATE ${this.table_product} SET price=${connection.escape(numPrice)},amount=${connection.escape(amount)},site_upload=0,rapnet_upload=0 WHERE id=${data.id} AND company=${this.companyId}`;
            } else {
              sql = `UPDATE ${this.table_product} SET cost=${connection.escape(numCost)},price=${connection.escape(numPrice)},amount=${connection.escape(amount)},site_upload=0,rapnet_upload=0 WHERE id=${data.id} AND company=${this.companyId}`;
            }
            await q(sql);

            const history = {
              product_id: data.id,
              action: "price_change",
              date: new Date().toISOString().slice(0, 19).replace("T", " "),
              narretion: "cost price or base price are changed.",
              description: `Old Price :  ${oldPrice} , New Price :  ${numPrice}`,
              price: numPrice,
              amount: amount,
            };
            const hData = helper.insertString(history);
            if (hData) await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);

            await auditBulkStoneRow({
              recordId: data.id,
              sku,
              oldValue: { price: oldPrice, cost: data.cost },
              newValue: { price: numPrice, cost: numCost },
              description: history.description,
            });
          }

          if (rap !== "") {
            const numRap = parseFloat(rap) || 0;
            const sql = `UPDATE ${this.table_product} SET rap_price=${connection.escape(numRap)},site_upload=0,rapnet_upload=0 WHERE id=${data.id} AND company=${this.companyId}`;
            await q(sql);

            const history = {
              product_id: data.id,
              action: "price_change",
              date: new Date().toISOString().slice(0, 19).replace("T", " "),
              narretion: "Rap price or Sell price are changed.",
              description: `Old Rap :  ${oldRap} , New Rap :  ${numRap}`,
            };
            const hData = helper.insertString(history);
            if (hData) await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);

            await auditBulkStoneRow({
              recordId: data.id,
              sku,
              oldValue: { rap_price: oldRap },
              newValue: { rap_price: numRap },
              description: history.description,
            });
          }
        }
        if (spid.length > 0) {
          const track = {
            product_id: spid.join(","),
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            description: `cost price or base price are changed of ${skuarr.join(",")}`,
            company: this.companyId,
            user: helper.DEFAULT_USER_ID,
          };
          const tData = helper.insertString(track);
          if (tData) await q(`INSERT INTO dai_user_track (${tData[0]}) VALUES (${tData[1]})`);
        }
      } else if (type === "location") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sql = `UPDATE ${this.table_product} SET location=${connection.escape(
            row.B
          )},site_upload=0,rapnet_upload=0 WHERE sku=${connection.escape(row.A || "")} AND company=${this.companyId}`;
          await q(sql);
        }
      } else if (type === "intensity") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const int = String(row.B || "").trim();
          const over = String(row.C || "").trim();
          const color = String(row.D || "").trim();
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          let sql = "";
          if (color !== "") {
            sql = `UPDATE ${this.table_product_value} SET intensity=${connection.escape(
              int
            )},overtone=${connection.escape(over)},color=${connection.escape(color)} WHERE product_id=${data.id}`;
          } else {
            sql = `UPDATE ${this.table_product_value} SET intensity=${connection.escape(
              int
            )},overtone=${connection.escape(over)} WHERE product_id=${data.id}`;
          }
          await q(sql);
          await q(`UPDATE ${this.table_product} SET site_upload=0,rapnet_upload=0 WHERE id=${data.id} AND company=${this.companyId}`);
        }
      } else if (type === "package") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const pkg = String(row.B || "").trim();
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product_value} SET package=${connection.escape(pkg)} WHERE product_id=${data.id}`
          );
        }
      } else if (type === "sku") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const newsku = String(row.B || "").trim();
          const data = await this.getDetailBySku(sku, q);
          skuarr.push(sku);
          spid.push(data.id);
          const Newdata = await this.getDetailBySku(newsku, q);
          const oldSku = data.sku;
          if (!data.id || sku === newsku || (Newdata && Newdata.id)) continue;
          await q(`UPDATE ${this.table_product} SET sku=${connection.escape(newsku)} WHERE id=${data.id} AND company=${this.companyId}`);

          const history = {
            product_id: data.id,
            action: "sku_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            narretion: "Sku Changed",
            description: `Old Sku :  ${oldSku} , New Sku :  ${newsku}`,
          };
          const hData = helper.insertString(history);
          if (hData) await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);

          await auditBulkStoneRow({
            recordId: data.id,
            sku: oldSku,
            oldValue: { sku: oldSku },
            newValue: { sku: newsku },
            description: history.description,
          });
        }
        if (spid.length > 0) {
          const track = {
            product_id: spid.join(","),
            action: "sku_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            description: `Sku Changed of ${skuarr.join(",")}`,
            company: this.companyId,
            user: helper.DEFAULT_USER_ID,
          };
          const tData = helper.insertString(track);
          if (tData) await q(`INSERT INTO dai_user_track (${tData[0]}) VALUES (${tData[1]})`);
        }
      } else if (type === "shape") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const shape = String(row.B || "").trim();
          const color = String(row.C || "").trim();
          const clarity = String(row.D || "").trim();
          const size = String(row.E || "").trim();
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(`UPDATE ${this.table_product} SET main_color=${connection.escape(color)} WHERE id=${data.id} AND company=${this.companyId}`);
          await q(
            `UPDATE ${this.table_product_value} SET shape=${connection.escape(shape)},color=${connection.escape(
              color
            )},clarity=${connection.escape(clarity)},size=${connection.escape(size)} WHERE product_id=${data.id}`
          );
        }
      } else if (type === "gia") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const gia = String(row.B || "").trim();
          const ProductData = await this.getDetailBySku(sku, q);
          if (!ProductData || !ProductData.id) continue;
          const gData = await helper.getGiaReport(gia.trim());
          if (gData.message !== "") continue;
          const color = gData.color;
          const pcarat = gData.weight !== "" && Number(gData.weight) !== 0 ? gData.weight : ProductData.polish_carat;
          const amount = Number(pcarat || 0) * Number(ProductData.price || 0);
          await q(
            `UPDATE ${this.table_product} SET lab='GIA',main_color=${connection.escape(
              color
            )},polish_carat=${connection.escape(
              pcarat
            )}, amount=${connection.escape(
              amount
            )},outward='',site_upload=0,rapnet_upload=0,is_uploadsite=1,is_uploadrapnet=1,visibility=1 WHERE id=${ProductData.id} AND company=${this.companyId}`
          );
          const attr = await helper.getAttributeField();
          const data = {};
          for (const ak of Object.keys(attr.record || {})) {
            if (ak === "size" || ak === "color") continue;
            if (Object.prototype.hasOwnProperty.call(gData, ak)) data[ak] = gData[ak];
          }
          const value = helper.getUpdateString(data);
          if (value) {
            await q(`UPDATE ${this.table_product_value} SET ${value} WHERE product_id=${ProductData.id}`);
          }
        }
      } else if (type === "rap_price") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const price = row.B;
          const data = await this.getDetailBySku(sku, q);
          skuarr.push(sku);
          spid.push(data.id);
          const oldPrice = data.rap_price;
          if (price === "" || Number(price) === 0) continue;
          const amount = Number(data.polish_carat || 0) * Number(price || 0);
          await q(
            `UPDATE ${this.table_product} SET rap_price=${price},rap_amount=${amount},site_upload=0,rapnet_upload=0 WHERE id=${data.id} AND company=${this.companyId}`
          );

          const history = {
            product_id: data.id,
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            narretion: "Rap price are changed.",
            description: `Old Price :  ${oldPrice} , New Price :  ${price}`,
            price,
            amount,
          };
          const hData = helper.insertString(history);
          if (hData) await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);

          await auditBulkStoneRow({
            recordId: data.id,
            sku,
            oldValue: { rap_price: oldPrice },
            newValue: { rap_price: price },
            description: history.description,
          });
        }
        if (spid.length > 0) {
          const track = {
            product_id: spid.join(","),
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            description: `Rap price changed of ${skuarr.join(",")}`,
            company: this.companyId,
            user: helper.DEFAULT_USER_ID,
          };
          const tData = helper.insertString(track);
          if (tData) await q(`INSERT INTO dai_user_track (${tData[0]}) VALUES (${tData[1]})`);
        }
      } else if (type === "group") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const main = String(row.B || "").toUpperCase();
          const sub = String(row.C || "").toUpperCase();
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product} SET main_group=${connection.escape(main)},sub_group=${connection.escape(
              sub
            )} WHERE id=${connection.escape(data.id)} AND company=${this.companyId}`
          );
        }
      } else if (type === "sku-pair") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const pair = String(row.B || "").trim();
          const data = await this.getDetailBySku(sku, q);
          if (data && data.id) {
            await q(
              `UPDATE ${this.table_product} SET pair=${connection.escape(
                pair
              )},site_upload=0,rapnet_upload=0 WHERE id=${connection.escape(data.id)} AND company=${this.companyId}`
            );
          }
          const data1 = await this.getDetailBySku(pair, q);
          if (data1 && data1.id) {
            await q(
              `UPDATE ${this.table_product} SET pair=${connection.escape(
                sku
              )},site_upload=0,rapnet_upload=0 WHERE id=${connection.escape(data1.id)} AND company=${this.companyId}`
            );
          }
        }
      } else if (type === "bgm-eyeclean") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const bgm = String(row.B || "").trim();
          const eye = String(row.C || "").trim();
          const data = await this.getDetailBySku(sku, q);
          if (data && data.id) {
            await q(
              `UPDATE ${this.table_product_value} SET bgm=${connection.escape(
                bgm
              )},eyeclean=${connection.escape(eye)} WHERE product_id=${connection.escape(data.id)}`
            );
          }
        }
      } else if (type === "category") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const cat = String(row.B || "").trim();
          if (sku === "") continue;
          await q(
            `UPDATE ${this.table_product} SET category=${connection.escape(cat)} WHERE sku=${connection.escape(sku)} AND company=${this.companyId}`
          );
        }
      } else if (type === "remark") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const cat = String(row.B || "").trim();
          if (sku === "") continue;
          await q(
            `UPDATE ${this.table_product} SET remark=${connection.escape(cat)} WHERE sku=${connection.escape(sku)} AND company=${this.companyId}`
          );
        }
      } else if (type === "argyle") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const argyle_color = String(row.B || "").trim();
          const in_house_clarity = String(row.C || "").trim();
          if (sku === "") continue;
          await q(
            `UPDATE ${this.table_product} SET argyle_color=${connection.escape(
              argyle_color
            )},in_house_clarity=${connection.escape(in_house_clarity)} WHERE sku=${connection.escape(sku)} AND company=${this.companyId}`
          );
        }
      } else if (type === "mining") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const origin = String(row.B || "").trim();
          const manuf = String(row.C || "").trim();
          if (sku === "") continue;
          await q(
            `UPDATE ${this.table_product} SET origin=${connection.escape(origin)},manufacture_origin=${connection.escape(
              manuf
            )} WHERE sku=${connection.escape(sku)} AND company=${this.companyId}`
          );
        }
      } else if (type === "csv-gia") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.F || "").trim();
          const report = String(row.D || "").trim();
          const temp = { sku, report, value: JSON.stringify(row) };
          const checkRows = await q(`SELECT * FROM dai_gia WHERE sku =${connection.escape(sku)}`);
          const gid = checkRows.length > 0 ? checkRows[0].id : "";
          if (gid === "") {
            const data = helper.getInsertString(temp);
            if (data) await q(`INSERT INTO dai_gia (${data[0]}) VALUES (${data[1]})`);
          } else {
            const values = helper.getUpdateString(temp);
            if (values) await q(`UPDATE dai_gia SET ${values} WHERE id=${gid}`);
          }
        }
      }

      return 1;
    });
  }
}

module.exports = BulkModel;
