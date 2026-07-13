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

function query(sql, values = []) {
  return helper.query(sql, values);
}

class BulkModel {
  constructor(companyId = helper.DEFAULT_COMPANY_ID) {
    this.table_product = "dai_product";
    this.table_product_value = "dai_product_value";
    this.companyId = Number(companyId) || helper.DEFAULT_COMPANY_ID;
  }

  async getDetailBySku(sku) {
    const sql = `SELECT * FROM ${this.table_product} WHERE company=? and visibility=1 and sku LIKE ${connection.escape(
      sku
    )}`;
    const rows = await query(sql, [this.companyId]);
    return rows.length > 0 ? rows[0] : {};
  }

  async importData(type, inputFile) {
    await helper.getAttribute(1);
    let rs = "Something Wrong !!!";
    const skuarr = [];
    const spid = [];

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

    if (type === "price") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const price = row.B != null ? String(row.B).trim() : "";
        const cost = row.C != null ? String(row.C).trim() : "";
        const rap = row.D != null ? String(row.D).trim() : "";
        if (!sku) continue;
        const data = await this.getDetailBySku(sku);
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
            sql = `UPDATE ${this.table_product} SET price=${connection.escape(numPrice)},amount=${connection.escape(amount)},site_upload=0,rapnet_upload=0 WHERE sku=${connection.escape(sku)}`;
          } else {
            sql = `UPDATE ${this.table_product} SET cost=${connection.escape(numCost)},price=${connection.escape(numPrice)},amount=${connection.escape(amount)},site_upload=0,rapnet_upload=0 WHERE sku=${connection.escape(sku)}`;
          }
          try {
            await query(sql);
          } catch (e) {
            return `${sku} : ${e.message}`;
          }
          const history = {
            product_id: data.id,
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            narretion: "cost price or base price are changed.",
            description: `Old Price :  ${oldPrice} , New Price :  ${numPrice}`,
            price: numPrice,
            amount: amount,
          };
          rs = await helper.addHistory(history);
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
          const sql = `UPDATE ${this.table_product} SET rap_price=${connection.escape(numRap)},site_upload=0,rapnet_upload=0 WHERE sku=${connection.escape(sku)}`;
          try {
            await query(sql);
          } catch (e) {
            return `${sku} : ${e.message}`;
          }
          const history = {
            product_id: data.id,
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            narretion: "Rap price or Sell price are changed.",
            description: `Old Rap :  ${oldRap} , New Rap :  ${numRap}`,
          };
          rs = await helper.addHistory(history);
          await auditBulkStoneRow({
            recordId: data.id,
            sku,
            oldValue: { rap_price: oldRap },
            newValue: { rap_price: numRap },
            description: history.description,
          });
        }
      }
      const track = {
        product_id: spid.join(","),
        action: "price_change",
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        description: `cost price or base price are changed of ${skuarr.join(",")}`,
        company: this.companyId,
        user: helper.DEFAULT_USER_ID,
      };
      rs = await helper.addUserTrack(track);
    } else if (type === "location") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sql = `UPDATE ${this.table_product} SET location=${connection.escape(
          row.B
        )},site_upload=0,rapnet_upload=0 WHERE sku=${connection.escape(row.A || "")}`;
        try {
          await query(sql);
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "intensity") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const int = String(row.B || "").trim();
        const over = String(row.C || "").trim();
        const color = String(row.D || "").trim();
        const data = await this.getDetailBySku(sku);
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
        try {
          await query(sql);
          await query(`UPDATE ${this.table_product} SET site_upload=0,rapnet_upload=0 WHERE id=${data.id}`);
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "package") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const pkg = String(row.B || "").trim();
        const data = await this.getDetailBySku(sku);
        if (!data || !data.id) continue;
        try {
          await query(
            `UPDATE ${this.table_product_value} SET package=${connection.escape(pkg)} WHERE product_id=${data.id}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "sku") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const newsku = String(row.B || "").trim();
        const data = await this.getDetailBySku(sku);
        skuarr.push(sku);
        spid.push(data.id);
        const Newdata = await this.getDetailBySku(newsku);
        const oldSku = data.sku;
        if (!data.id || sku === newsku || (Newdata && Newdata.id)) continue;
        try {
          await query(`UPDATE ${this.table_product} SET sku=${connection.escape(newsku)} WHERE id=${data.id}`);
        } catch (e) {
          return e.message;
        }
        const history = {
          product_id: data.id,
          action: "sku_change",
          date: new Date().toISOString().slice(0, 19).replace("T", " "),
          narretion: "Sku Changed",
          description: `Old Sku :  ${oldSku} , New Sku :  ${newsku}`,
        };
        rs = await helper.addHistory(history);
        await auditBulkStoneRow({
          recordId: data.id,
          sku: oldSku,
          oldValue: { sku: oldSku },
          newValue: { sku: newsku },
          description: history.description,
        });
      }
      const track = {
        product_id: spid.join(","),
        action: "sku_change",
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        description: `Sku Changed of ${skuarr.join(",")}`,
        company: this.companyId,
        user: helper.DEFAULT_USER_ID,
      };
      rs = await helper.addUserTrack(track);
    } else if (type === "shape") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const shape = String(row.B || "").trim();
        const color = String(row.C || "").trim();
        const clarity = String(row.D || "").trim();
        const size = String(row.E || "").trim();
        const data = await this.getDetailBySku(sku);
        if (!data || !data.id) continue;
        try {
          await query(`UPDATE ${this.table_product} SET main_color=${connection.escape(color)} WHERE id=${data.id}`);
          await query(
            `UPDATE ${this.table_product_value} SET shape=${connection.escape(shape)},color=${connection.escape(
              color
            )},clarity=${connection.escape(clarity)},size=${connection.escape(size)} WHERE product_id=${data.id}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "gia") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const gia = String(row.B || "").trim();
        const ProductData = await this.getDetailBySku(sku);
        if (!ProductData || !ProductData.id) continue;
        const gData = await helper.getGiaReport(gia.trim());
        if (gData.message !== "") continue;
        const color = gData.color;
        const pcarat = gData.weight !== "" && Number(gData.weight) !== 0 ? gData.weight : ProductData.polish_carat;
        const amount = Number(pcarat || 0) * Number(ProductData.price || 0);
        try {
          await query(
            `UPDATE ${this.table_product} SET lab='GIA',main_color=${connection.escape(
              color
            )},polish_carat=${connection.escape(
              pcarat
            )}, amount=${connection.escape(
              amount
            )},outward='',site_upload=0,rapnet_upload=0,is_uploadsite=1,is_uploadrapnet=1,visibility=1 WHERE id=${ProductData.id}`
          );
        } catch (e) {
          return e.message;
        }
        const attr = await helper.getAttributeField();
        const data = {};
        for (const ak of Object.keys(attr.record || {})) {
          if (ak === "size" || ak === "color") continue;
          if (Object.prototype.hasOwnProperty.call(gData, ak)) data[ak] = gData[ak];
        }
        const value = helper.getUpdateString(data);
        try {
          await query(`UPDATE ${this.table_product_value} SET ${value} WHERE product_id=${ProductData.id}`);
          rs = 1;
        } catch (e) {
          rs = e.message;
        }
      }
    } else if (type === "rap_price") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const price = row.B;
        const data = await this.getDetailBySku(sku);
        skuarr.push(sku);
        spid.push(data.id);
        const oldPrice = data.rap_price;
        if (price === "" || Number(price) === 0) continue;
        const amount = Number(data.polish_carat || 0) * Number(price || 0);
        try {
          await query(
            `UPDATE ${this.table_product} SET rap_price=${price},rap_amount=${amount},site_upload=0,rapnet_upload=0 WHERE sku=${connection.escape(
              sku
            )}`
          );
        } catch (e) {
          return e.message;
        }
        const history = {
          product_id: data.id,
          action: "price_change",
          date: new Date().toISOString().slice(0, 19).replace("T", " "),
          narretion: "Rap price are changed.",
          description: `Old Price :  ${oldPrice} , New Price :  ${price}`,
          price,
          amount,
        };
        rs = await helper.addHistory(history);
        await auditBulkStoneRow({
          recordId: data.id,
          sku,
          oldValue: { rap_price: oldPrice },
          newValue: { rap_price: price },
          description: history.description,
        });
      }
      const track = {
        product_id: spid.join(","),
        action: "price_change",
        date: new Date().toISOString().slice(0, 19).replace("T", " "),
        description: `Rap price changed of ${skuarr.join(",")}`,
        company: this.companyId,
        user: helper.DEFAULT_USER_ID,
      };
      rs = await helper.addUserTrack(track);
    } else if (type === "group") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const main = String(row.B || "").toUpperCase();
        const sub = String(row.C || "").toUpperCase();
        const data = await this.getDetailBySku(sku);
        if (!data || !data.id) continue;
        try {
          await query(
            `UPDATE ${this.table_product} SET main_group=${connection.escape(main)},sub_group=${connection.escape(
              sub
            )} WHERE id=${connection.escape(data.id)}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "sku-pair") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const pair = String(row.B || "").trim();
        const data = await this.getDetailBySku(sku);
        if (data && data.id) {
          try {
            await query(
              `UPDATE ${this.table_product} SET pair=${connection.escape(
                pair
              )},site_upload=0,rapnet_upload=0 WHERE id=${connection.escape(data.id)}`
            );
          } catch (e) {
            return e.message;
          }
        }
        const data1 = await this.getDetailBySku(pair);
        if (data1 && data1.id) {
          try {
            await query(
              `UPDATE ${this.table_product} SET pair=${connection.escape(
                sku
              )},site_upload=0,rapnet_upload=0 WHERE id=${connection.escape(data1.id)}`
            );
            rs = 1;
          } catch (e) {
            return e.message;
          }
        }
      }
    } else if (type === "bgm-eyeclean") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const bgm = String(row.B || "").trim();
        const eye = String(row.C || "").trim();
        const data = await this.getDetailBySku(sku);
        if (data && data.id) {
          try {
            await query(
              `UPDATE ${this.table_product_value} SET bgm=${connection.escape(
                bgm
              )},eyeclean=${connection.escape(eye)} WHERE product_id=${connection.escape(data.id)}`
            );
            rs = 1;
          } catch (e) {
            return e.message;
          }
        }
      }
    } else if (type === "category") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const cat = String(row.B || "").trim();
        if (sku === "") continue;
        try {
          await query(
            `UPDATE ${this.table_product} SET category=${connection.escape(cat)} WHERE sku=${connection.escape(sku)}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "remark") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const cat = String(row.B || "").trim();
        if (sku === "") continue;
        try {
          await query(
            `UPDATE ${this.table_product} SET remark=${connection.escape(cat)} WHERE sku=${connection.escape(sku)}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "argyle") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const argyle_color = String(row.B || "").trim();
        const in_house_clarity = String(row.C || "").trim();
        if (sku === "") continue;
        try {
          await query(
            `UPDATE ${this.table_product} SET argyle_color=${connection.escape(
              argyle_color
            )},in_house_clarity=${connection.escape(in_house_clarity)} WHERE sku=${connection.escape(sku)}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "mining") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.A || "").trim();
        const origin = String(row.B || "").trim();
        const manuf = String(row.C || "").trim();
        if (sku === "") continue;
        try {
          await query(
            `UPDATE ${this.table_product} SET origin=${connection.escape(origin)},manufacture_origin=${connection.escape(
              manuf
            )} WHERE sku=${connection.escape(sku)}`
          );
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    } else if (type === "csv-gia") {
      for (let i = 2; i <= arrayCount; i++) {
        const row = allDataInSheet[i - 1] || {};
        const sku = String(row.F || "").trim();
        const report = String(row.D || "").trim();
        const temp = { sku, report, value: JSON.stringify(row) };
        const checkRows = await query(`SELECT * FROM dai_gia WHERE sku =${connection.escape(sku)}`);
        const gid = checkRows.length > 0 ? checkRows[0].id : "";
        try {
          if (gid === "") {
            const data = helper.getInsertString(temp);
            await query(`INSERT INTO dai_gia (${data[0]}) VALUES (${data[1]})`);
          } else {
            const values = helper.getUpdateString(temp);
            await query(`UPDATE dai_gia SET ${values} WHERE id=${gid}`);
          }
          rs = 1;
        } catch (e) {
          return e.message;
        }
      }
    }

    return typeof rs === "string" ? rs : 1;
  }
}

module.exports = BulkModel;
