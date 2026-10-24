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
  constructor(companyId = helper.DEFAULT_COMPANY_ID, allowedCompanyIds = null, userId = null) {
    this.table_product = "dai_product";
    this.table_product_value = "dai_product_value";
    this.companyId = Number(companyId) || helper.DEFAULT_COMPANY_ID;
    this.userId = Number(userId) || helper.DEFAULT_USER_ID;
    if (Array.isArray(allowedCompanyIds) && allowedCompanyIds.length) {
      this.allowedCompanyIds = allowedCompanyIds.map(Number).filter((id) => id > 0);
    } else {
      this.allowedCompanyIds = [this.companyId];
    }
  }

  async getDetailBySku(sku, q = null) {
    const trimmed = String(sku || "").trim();
    if (!trimmed) return {};
    const companyPlaceholders = this.allowedCompanyIds.map(() => "?").join(",");
    const sql = `SELECT * FROM ${this.table_product} 
      WHERE company IN (${companyPlaceholders}) 
        AND (sku = ? OR TRIM(sku) = ? OR sku LIKE ?) 
      ORDER BY (company = ?) DESC, visibility DESC 
      LIMIT 1`;
    const params = [...this.allowedCompanyIds, trimmed, trimmed, trimmed, this.companyId];
    const rows = q ? await q(sql, params) : await helper.query(sql, params);
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
        let skuCol = "A";
        let priceCol = "B";
        let costCol = "C";
        let rapCol = "D";
        let startRowIndex = 1;

        const firstRow = allDataInSheet[0] || {};
        const firstRowVals = Object.entries(firstRow).map(([k, v]) => ({ col: k, val: String(v || "").trim().toLowerCase() }));
        const hasHeader = firstRowVals.some(({ val }) => /^(sku|stone|diamond|price|cost|rap)/i.test(val));

        if (hasHeader) {
          startRowIndex = 1;
          for (const { col, val } of firstRowVals) {
            if (/^(sku|stone\s*id|stone_id|diamond_no|item)$/i.test(val)) skuCol = col;
            else if (/^(price|sell\s*price|base\s*price)$/i.test(val)) priceCol = col;
            else if (/^(cost|cost\s*price)$/i.test(val)) costCol = col;
            else if (/^(rap|rap\s*price|rapnet)$/i.test(val)) rapCol = col;
          }
        } else {
          startRowIndex = 0;
        }

        const notFoundSkus = [];
        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const price = row[priceCol] != null ? String(row[priceCol]).trim() : "";
          const cost = row[costCol] != null ? String(row[costCol]).trim() : "";
          const rap = row[rapCol] != null ? String(row[rapCol]).trim() : "";
          if (!sku) continue;

          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          skuarr.push(sku);
          spid.push(data.id);
          const oldPrice = data.price;
          const oldRap = data.rap_price;

          if (price !== "") {
            const numPrice = parseFloat(price) || 0;
            const numCost = parseFloat(cost) || 0;
            const carat = parseFloat(data.polish_carat || 0);
            const amount = carat > 0 ? carat * numPrice : (parseFloat(data.amount || 0) || 0);
            let sql = "";
            let params = [];
            if (cost === "") {
              sql = `UPDATE ${this.table_product} SET price=?, amount=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
              params = [numPrice, amount, data.id, data.company];
            } else {
              sql = `UPDATE ${this.table_product} SET cost=?, price=?, amount=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
              params = [numCost, numPrice, amount, data.id, data.company];
            }
            const isPriceChanged = Number(oldPrice) !== Number(numPrice);
            const isCostChanged = cost !== "" && Number(data.cost || 0) !== Number(numCost);

            if (isPriceChanged || isCostChanged) {
              const history = {
                product_id: data.id,
                sku: data.sku,
                action: "price_change",
                date: new Date().toISOString().slice(0, 19).replace("T", " "),
                narretion: "cost price or base price are changed.",
                description: `Old Price :  ${oldPrice} , New Price :  ${numPrice}`,
                price: numPrice,
                amount: amount,
                user: this.userId || helper.DEFAULT_USER_ID,
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
          }

          if (rap !== "") {
            const numRap = parseFloat(rap) || 0;
            const carat = parseFloat(data.polish_carat || 0);
            const rapAmount = carat > 0 ? carat * numRap : 0;
            const sql = `UPDATE ${this.table_product} SET rap_price=?, rap_amount=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
            await q(sql, [numRap, rapAmount, data.id, data.company]);

            if (Number(oldRap || 0) !== Number(numRap)) {
              const history = {
                product_id: data.id,
                sku: data.sku,
                action: "price_change",
                date: new Date().toISOString().slice(0, 19).replace("T", " "),
                narretion: "Rap price or Sell price are changed.",
                description: `Old Rap :  ${oldRap} , New Rap :  ${numRap}`,
                user: this.userId || helper.DEFAULT_USER_ID,
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
        }
        if (spid.length > 0) {
          const track = {
            product_id: spid.join(","),
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            description: `cost price or base price are changed of ${skuarr.join(",")}`,
            company: this.companyId,
            user: this.userId || helper.DEFAULT_USER_ID,
          };
          try {
            const tData = helper.insertString(track);
            if (tData) await q(`INSERT INTO user_track (${tData[0]}) VALUES (${tData[1]})`);
          } catch (trackErr) {
            console.error("user_track log error (price):", trackErr?.message || trackErr);
          }
        }
        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone(s) successfully !!!` };
      } else if (type === "location") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          if (!sku) continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          const sql = `UPDATE ${this.table_product} SET location=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
          await q(sql, [row.B, data.id, data.company]);
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
          await q(`UPDATE ${this.table_product} SET site_upload=0,rapnet_upload=0 WHERE id=${data.id} AND company=${data.company}`);
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
          await q(`UPDATE ${this.table_product} SET sku=${connection.escape(newsku)} WHERE id=${data.id} AND company=${data.company}`);

          const history = {
            product_id: data.id,
            action: "sku_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            narretion: "Sku Changed",
            description: `Old Sku :  ${oldSku} , New Sku :  ${newsku}`,
            user: this.userId || helper.DEFAULT_USER_ID,
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
            user: this.userId || helper.DEFAULT_USER_ID,
          };
          try {
            const tData = helper.insertString(track);
            if (tData) await q(`INSERT INTO user_track (${tData[0]}) VALUES (${tData[1]})`);
          } catch (trackErr) {
            console.error("user_track log error (sku):", trackErr?.message || trackErr);
          }
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
          await q(`UPDATE ${this.table_product} SET main_color=${connection.escape(color)} WHERE id=${data.id} AND company=${data.company}`);
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
            )},outward='',site_upload=0,rapnet_upload=0,is_uploadsite=1,is_uploadrapnet=1,visibility=1 WHERE id=${ProductData.id} AND company=${ProductData.company}`
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
        let skuCol = "A";
        let priceCol = "B";
        let startRowIndex = 1;

        const firstRow = allDataInSheet[0] || {};
        const firstRowVals = Object.entries(firstRow).map(([k, v]) => ({ col: k, val: String(v || "").trim().toLowerCase() }));
        const hasHeader = firstRowVals.some(({ val }) => /^(sku|stone|diamond|rap|price)/i.test(val));

        if (hasHeader) {
          startRowIndex = 1;
          for (const { col, val } of firstRowVals) {
            if (/^(sku|stone\s*id|stone_id|diamond_no|item)$/i.test(val)) skuCol = col;
            else if (/^(rap|rap\s*price|rapnet|price)$/i.test(val)) priceCol = col;
          }
        } else {
          startRowIndex = 0;
        }

        const notFoundSkus = [];
        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const price = row[priceCol] != null ? String(row[priceCol]).trim() : "";
          if (!sku) continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          skuarr.push(sku);
          spid.push(data.id);
          const oldPrice = data.rap_price;
          if (price === "" || Number(price) === 0) continue;
          const numPrice = parseFloat(price) || 0;
          const carat = parseFloat(data.polish_carat || 0);
          const amount = carat * numPrice;
          await q(
            `UPDATE ${this.table_product} SET rap_price=?, rap_amount=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`,
            [numPrice, amount, data.id, data.company]
          );

          const history = {
            product_id: data.id,
            sku: data.sku,
            action: "price_change",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
            narretion: "Rap price are changed.",
            description: `Old Price :  ${oldPrice} , New Price :  ${numPrice}`,
            price: numPrice,
            amount,
            user: this.userId || helper.DEFAULT_USER_ID,
          };
          const hData = helper.insertString(history);
          if (hData) await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);

          await auditBulkStoneRow({
            recordId: data.id,
            sku,
            oldValue: { rap_price: oldPrice },
            newValue: { rap_price: numPrice },
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
            user: this.userId || helper.DEFAULT_USER_ID,
          };
          try {
            const tData = helper.insertString(track);
            if (tData) await q(`INSERT INTO user_track (${tData[0]}) VALUES (${tData[1]})`);
          } catch (trackErr) {
            console.error("user_track log error (rap_price):", trackErr?.message || trackErr);
          }
        }
        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone(s) successfully !!!` };
      } else if (type === "group") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const main = String(row.B || "").toUpperCase();
          const sub = String(row.C || "").toUpperCase();
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product} SET main_group=?, sub_group=? WHERE id=? AND company=?`,
            [main, sub, data.id, data.company]
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
              `UPDATE ${this.table_product} SET pair=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`,
              [pair, data.id, data.company]
            );
          }
          const data1 = await this.getDetailBySku(pair, q);
          if (data1 && data1.id) {
            await q(
              `UPDATE ${this.table_product} SET pair=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`,
              [sku, data1.id, data1.company]
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
              `UPDATE ${this.table_product_value} SET bgm=?, eyeclean=? WHERE product_id=?`,
              [bgm, eye, data.id]
            );
          }
        }
      } else if (type === "category") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const cat = String(row.B || "").trim();
          if (sku === "") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product} SET category=? WHERE id=? AND company=?`,
            [cat, data.id, data.company]
          );
        }
      } else if (type === "remark") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const cat = String(row.B || "").trim();
          if (sku === "") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product} SET remark=? WHERE id=? AND company=?`,
            [cat, data.id, data.company]
          );
        }
      } else if (type === "argyle") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const argyle_color = String(row.B || "").trim();
          const in_house_clarity = String(row.C || "").trim();
          if (sku === "") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product} SET argyle_color=?, in_house_clarity=? WHERE id=? AND company=?`,
            [argyle_color, in_house_clarity, data.id, data.company]
          );
        }
      } else if (type === "mining") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.A || "").trim();
          const origin = String(row.B || "").trim();
          const manuf = String(row.C || "").trim();
          if (sku === "") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) continue;
          await q(
            `UPDATE ${this.table_product} SET origin=?, manufacture_origin=? WHERE id=? AND company=?`,
            [origin, manuf, data.id, data.company]
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
