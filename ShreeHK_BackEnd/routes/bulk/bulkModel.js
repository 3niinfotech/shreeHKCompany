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
    // ignore audit failure if table doesn't exist
  }
}

function findHeaderRowAndCols(allDataInSheet, colMatchers) {
  const maxRowsToCheck = Math.min(3, allDataInSheet.length);
  let matchedRowIndex = -1;
  let detectedCols = {};

  for (let r = 0; r < maxRowsToCheck; r++) {
    const row = allDataInSheet[r] || {};
    const entries = Object.entries(row).map(([col, val]) => ({
      col,
      val: String(val || "").trim().toLowerCase(),
    }));

    const rowMatches = {};
    for (const [key, regex] of Object.entries(colMatchers)) {
      for (const { col, val } of entries) {
        if (regex.test(val) && !rowMatches[key]) {
          rowMatches[key] = col;
        }
      }
    }

    if (Object.keys(rowMatches).length > 0) {
      matchedRowIndex = r;
      detectedCols = rowMatches;
      break;
    }
  }

  return {
    startRowIndex: matchedRowIndex >= 0 ? matchedRowIndex + 1 : 0,
    cols: detectedCols,
  };
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
        AND (sku = ? OR TRIM(sku) = ?) 
      ORDER BY (company = ?) DESC, visibility DESC 
      LIMIT 1`;
    const params = [...this.allowedCompanyIds, trimmed, trimmed, this.companyId];
    const rows = q ? await q(sql, params) : await helper.query(sql, params);
    if (rows && rows.length > 0) return rows[0];

    // Fallback: If not found in current allowed company scope, search across all companies
    const fallbackSql = `SELECT * FROM ${this.table_product} 
      WHERE (sku = ? OR TRIM(sku) = ?) 
      ORDER BY (company = ?) DESC, visibility DESC 
      LIMIT 1`;
    const fallbackRows = q
      ? await q(fallbackSql, [trimmed, trimmed, this.companyId])
      : await helper.query(fallbackSql, [trimmed, trimmed, this.companyId]);
    return fallbackRows && fallbackRows.length > 0 ? fallbackRows[0] : {};
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
      const skuarr = [];
      const spid = [];
      const notFoundSkus = [];

      if (type === "price") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone\s*id|stone_id|diamond_no|diamond|item|stock\s*id)$/i,
          price: /^(price|sell\s*price|sale\s*price|base\s*price|rate|price\s*\/.*|unit\s*price|new\s*price)$/i,
          cost: /^(cost|cost\s*price|purchase\s*price|buy\s*price)$/i,
          rap: /^(rap|rap\s*price|rapnet|rap\s*rate)$/i,
        });

        const skuCol = cols.sku || "A";
        const priceCol = cols.price || "B";
        const costCol = cols.cost || "C";
        const rapCol = cols.rap || "D";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const price = row[priceCol] != null ? String(row[priceCol]).trim() : "";
          const cost = row[costCol] != null ? String(row[costCol]).trim() : "";
          const rap = row[rapCol] != null ? String(row[rapCol]).trim() : "";
          if (!sku || sku.toLowerCase() === "sku") continue;

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
            const cleanPrice = String(price).replace(/,/g, "").replace(/[^0-9.]/g, "");
            const numPrice = parseFloat(cleanPrice) || 0;
            const cleanCost = String(cost).replace(/,/g, "").replace(/[^0-9.]/g, "");
            const numCost = parseFloat(cleanCost) || 0;
            const carat = parseFloat(data.polish_carat || data.onhand_carat || 0);
            const amount = carat > 0 ? Number((carat * numPrice).toFixed(2)) : (parseFloat(data.amount || 0) || 0);
            let sql = "";
            let params = [];
            if (cost === "") {
              sql = `UPDATE ${this.table_product} SET price=?, sell_price=?, amount=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
              params = [numPrice, numPrice, amount, amount, data.id, data.company];
            } else {
              sql = `UPDATE ${this.table_product} SET cost=?, price=?, sell_price=?, amount=?, sell_amount=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
              params = [numCost, numPrice, numPrice, amount, amount, data.id, data.company];
            }
            await q(sql, params);
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
          } else if (cost !== "") {
            const numCost = parseFloat(String(cost).replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
            const sql = `UPDATE ${this.table_product} SET cost=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
            await q(sql, [numCost, data.id, data.company]);

            if (Number(data.cost || 0) !== Number(numCost)) {
              const history = {
                product_id: data.id,
                sku: data.sku,
                action: "price_change",
                date: new Date().toISOString().slice(0, 19).replace("T", " "),
                narretion: "cost price changed.",
                description: `Old Cost :  ${data.cost} , New Cost :  ${numCost}`,
                cost: numCost,
                user: this.userId || helper.DEFAULT_USER_ID,
              };
              const hData = helper.insertString(history);
              if (hData) await q(`INSERT INTO dai_history (${hData[0]}) VALUES (${hData[1]})`);

              await auditBulkStoneRow({
                recordId: data.id,
                sku,
                oldValue: { cost: data.cost },
                newValue: { cost: numCost },
                description: history.description,
              });
            }
          }

          if (rap !== "") {
            const numRap = parseFloat(String(rap).replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
            const carat = parseFloat(data.polish_carat || data.onhand_carat || 0);
            const rapAmount = carat > 0 ? Number((carat * numRap).toFixed(2)) : 0;
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
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|stone_id|diamond_no|diamond|item)$/i,
          loc: /^(loc|location|branch)$/i,
        });
        const skuCol = cols.sku || "A";
        const locCol = cols.loc || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const loc = String(row[locCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          const sql = `UPDATE ${this.table_product} SET location=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`;
          await q(sql, [loc, data.id, data.company]);
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone location(s) successfully !!!` };
      } else if (type === "intensity") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          intensity: /^(intensity|fancy\s*intensity)$/i,
          overtone: /^(overtone|fancy\s*overtone)$/i,
          color: /^(color|fancy\s*color)$/i,
        });
        const skuCol = cols.sku || "A";
        const intCol = cols.intensity || "B";
        const overCol = cols.overtone || "C";
        const colorCol = cols.color || "D";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const int = String(row[intCol] || "").trim();
          const over = String(row[overCol] || "").trim();
          const color = String(row[colorCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);

          if (color !== "") {
            await q(
              `UPDATE ${this.table_product_value} SET intensity=?, overtone=?, color=? WHERE product_id=?`,
              [int, over, color, data.id]
            );
          } else {
            await q(
              `UPDATE ${this.table_product_value} SET intensity=?, overtone=? WHERE product_id=?`,
              [int, over, data.id]
            );
          }
          await q(`UPDATE ${this.table_product} SET site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`, [data.id, data.company]);
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone intensity successfully !!!` };
      } else if (type === "package") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          pkg: /^(package|pkg|lot)$/i,
        });
        const skuCol = cols.sku || "A";
        const pkgCol = cols.pkg || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const pkg = String(row[pkgCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          await q(
            `UPDATE ${this.table_product_value} SET package=? WHERE product_id=?`,
            [pkg, data.id]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone package(s) successfully !!!` };
      } else if (type === "sku") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|old\s*sku|stone|stone_id)$/i,
          newsku: /^(new\s*sku|newsku|target\s*sku)$/i,
        });
        const skuCol = cols.sku || "A";
        const newSkuCol = cols.newsku || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const newsku = String(row[newSkuCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id || sku === newsku) {
            if (!data || !data.id) notFoundSkus.push(sku);
            continue;
          }
          const Newdata = await this.getDetailBySku(newsku, q);
          if (Newdata && Newdata.id) continue;

          skuarr.push(sku);
          spid.push(data.id);
          const oldSku = data.sku;

          await q(`UPDATE ${this.table_product} SET sku=? WHERE id=? AND company=?`, [newsku, data.id, data.company]);

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

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} SKU(s) successfully !!!` };
      } else if (type === "shape") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          shape: /^(shape)$/i,
          clarity: /^(clarity)$/i,
          color: /^(color|main_color)$/i,
          size: /^(size)$/i,
        });

        const isThreeColFormat = !cols.color && !cols.size && Object.keys(cols).length <= 2;
        const skuCol = cols.sku || "A";
        const shapeCol = cols.shape || "B";
        // If 3-column template [Sku, Shape, Clarity], C is clarity!
        const clarityCol = cols.clarity || (isThreeColFormat ? "C" : "D");
        const colorCol = cols.color || (isThreeColFormat ? "" : "C");
        const sizeCol = cols.size || (isThreeColFormat ? "" : "E");

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const shape = String(row[shapeCol] || "").trim();
          const clarity = clarityCol ? String(row[clarityCol] || "").trim() : "";
          const color = colorCol ? String(row[colorCol] || "").trim() : "";
          const size = sizeCol ? String(row[sizeCol] || "").trim() : "";

          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);

          if (color) {
            await q(`UPDATE ${this.table_product} SET main_color=? WHERE id=? AND company=?`, [color, data.id, data.company]);
          }

          const setClauses = [];
          const setParams = [];
          if (shape) { setClauses.push("shape=?"); setParams.push(shape); }
          if (clarity) { setClauses.push("clarity=?"); setParams.push(clarity); }
          if (color) { setClauses.push("color=?"); setParams.push(color); }
          if (size) { setClauses.push("size=?"); setParams.push(size); }

          if (setClauses.length > 0) {
            setParams.push(data.id);
            await q(`UPDATE ${this.table_product_value} SET ${setClauses.join(", ")} WHERE product_id=?`, setParams);
          }
          await q(`UPDATE ${this.table_product} SET site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`, [data.id, data.company]);
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone shape/clarity successfully !!!` };
      } else if (type === "gia") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          gia: /^(cert|cert\s*no|report|report\s*no|gia|gia\s*report)$/i,
        });
        const skuCol = cols.sku || "A";
        const giaCol = cols.gia || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const gia = String(row[giaCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const ProductData = await this.getDetailBySku(sku, q);
          if (!ProductData || !ProductData.id) {
            notFoundSkus.push(sku);
            continue;
          }
          const gData = await helper.getGiaReport(gia.trim());
          if (gData.message !== "") continue;
          spid.push(ProductData.id);
          skuarr.push(sku);

          const color = gData.color;
          const pcarat = gData.weight !== "" && Number(gData.weight) !== 0 ? gData.weight : ProductData.polish_carat;
          const amount = Number(pcarat || 0) * Number(ProductData.price || 0);
          await q(
            `UPDATE ${this.table_product} SET lab='GIA', main_color=?, polish_carat=?, amount=?, outward='', site_upload=0, rapnet_upload=0, is_uploadsite=1, is_uploadrapnet=1, visibility=1 WHERE id=? AND company=?`,
            [color, pcarat, amount, ProductData.id, ProductData.company]
          );
          const attr = await helper.getAttributeField();
          const data = {};
          for (const ak of Object.keys(attr.record || {})) {
            if (ak === "size" || ak === "color") continue;
            if (Object.prototype.hasOwnProperty.call(gData, ak)) data[ak] = gData[ak];
          }
          const value = helper.getUpdateString(data);
          if (value) {
            await q(`UPDATE ${this.table_product_value} SET ${value} WHERE product_id=?`, [ProductData.id]);
          }
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} GIA report(s) successfully !!!` };
      } else if (type === "rap_price") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|stone_id|diamond_no|item)$/i,
          price: /^(rap|rap\s*price|rapnet|price)$/i,
        });
        const skuCol = cols.sku || "A";
        const priceCol = cols.price || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const price = row[priceCol] != null ? String(row[priceCol]).trim() : "";
          if (!sku || sku.toLowerCase() === "sku") continue;
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
          const carat = parseFloat(data.polish_carat || data.onhand_carat || 0);
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
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          main: /^(main|main\s*group|group)$/i,
          sub: /^(sub|sub\s*group)$/i,
        });
        const skuCol = cols.sku || "A";
        const mainCol = cols.main || "B";
        const subCol = cols.sub || "C";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const main = String(row[mainCol] || "").toUpperCase();
          const sub = String(row[subCol] || "").toUpperCase();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          await q(
            `UPDATE ${this.table_product} SET main_group=?, sub_group=? WHERE id=? AND company=?`,
            [main, sub, data.id, data.company]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone group(s) successfully !!!` };
      } else if (type === "sku-pair") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|first\s*sku)$/i,
          pair: /^(pair|pair\s*sku|second\s*sku)$/i,
        });
        const skuCol = cols.sku || "A";
        const pairCol = cols.pair || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const pair = String(row[pairCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (data && data.id) {
            spid.push(data.id);
            skuarr.push(sku);
            await q(
              `UPDATE ${this.table_product} SET pair=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`,
              [pair, data.id, data.company]
            );
          } else {
            notFoundSkus.push(sku);
          }
          const data1 = await this.getDetailBySku(pair, q);
          if (data1 && data1.id) {
            await q(
              `UPDATE ${this.table_product} SET pair=?, site_upload=0, rapnet_upload=0 WHERE id=? AND company=?`,
              [sku, data1.id, data1.company]
            );
          }
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} pair(s) successfully !!!` };
      } else if (type === "bgm-eyeclean") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          bgm: /^(bgm)$/i,
          eye: /^(eye|eyeclean|eye\s*clean)$/i,
        });
        const skuCol = cols.sku || "A";
        const bgmCol = cols.bgm || "B";
        const eyeCol = cols.eye || "C";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const bgm = String(row[bgmCol] || "").trim();
          const eye = String(row[eyeCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          await q(
            `UPDATE ${this.table_product_value} SET bgm=?, eyeclean=? WHERE product_id=?`,
            [bgm, eye, data.id]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone BGM/Eye Clean successfully !!!` };
      } else if (type === "category") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          cat: /^(cat|category|categoryid|category\s*id)$/i,
        });
        const skuCol = cols.sku || "A";
        const catCol = cols.cat || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const cat = String(row[catCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          await q(
            `UPDATE ${this.table_product} SET category=? WHERE id=? AND company=?`,
            [cat, data.id, data.company]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone category successfully !!!` };
      } else if (type === "remark") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          remark: /^(remark|remarks|comment|note)$/i,
        });
        const skuCol = cols.sku || "A";
        const remarkCol = cols.remark || "B";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const remark = String(row[remarkCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          await q(
            `UPDATE ${this.table_product} SET remark=? WHERE id=? AND company=?`,
            [remark, data.id, data.company]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone remark(s) successfully !!!` };
      } else if (type === "argyle") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          argyle: /^(argyle|argyle\s*color)$/i,
          inhouse: /^(in\s*house\s*clarity|in\s*house|clarity)$/i,
        });
        const skuCol = cols.sku || "A";
        const argyleCol = cols.argyle || "B";
        // If 4 columns [Sku, Argyle Color, In House, Clarity], D is clarity!
        const inhouseCol = cols.inhouse || (allDataInSheet[0]?.D != null && allDataInSheet[0]?.D !== "" ? "D" : "C");

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const argyle_color = String(row[argyleCol] || "").trim();
          // If column D has clarity (e.g. from 4-col template), prioritize it
          const in_house_clarity = String(row[inhouseCol] || row.D || row.C || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          await q(
            `UPDATE ${this.table_product} SET argyle_color=?, in_house_clarity=? WHERE id=? AND company=?`,
            [argyle_color, in_house_clarity, data.id, data.company]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone Argyle/In-House clarity successfully !!!` };
      } else if (type === "mining") {
        const { startRowIndex, cols } = findHeaderRowAndCols(allDataInSheet, {
          sku: /^(sku|stone|diamond)$/i,
          mining: /^(mining|mining\s*origin)$/i,
          origin: /^(origin|manufacture|manufacturing|manufacturing\s*origin|menufecturing\s*origin)$/i,
        });
        const skuCol = cols.sku || "A";
        const miningCol = cols.mining || "B";
        const originCol = cols.origin || "C";

        for (let i = startRowIndex; i < arrayCount; i++) {
          const row = allDataInSheet[i] || {};
          const sku = String(row[skuCol] || "").trim();
          const mining = String(row[miningCol] || "").trim();
          const origin = String(row[originCol] || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          const data = await this.getDetailBySku(sku, q);
          if (!data || !data.id) {
            notFoundSkus.push(sku);
            continue;
          }
          spid.push(data.id);
          skuarr.push(sku);
          // dai_product columns are `mining` and `origin` (not `manufacture_origin`)
          await q(
            `UPDATE ${this.table_product} SET mining=?, origin=? WHERE id=? AND company=?`,
            [mining, origin, data.id, data.company]
          );
        }

        if (spid.length === 0) {
          return notFoundSkus.length
            ? `No matching stone found for: ${notFoundSkus.slice(0, 3).join(", ")}${notFoundSkus.length > 3 ? "..." : ""}`
            : "No valid data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Updated ${spid.length} stone mining/origin successfully !!!` };
      } else if (type === "csv-gia") {
        for (let i = 2; i <= arrayCount; i++) {
          const row = allDataInSheet[i - 1] || {};
          const sku = String(row.F || "").trim();
          const report = String(row.D || "").trim();
          if (!sku || sku.toLowerCase() === "sku") continue;
          spid.push(sku);
          const temp = { sku, report, value: JSON.stringify(row) };
          const checkRows = await q(`SELECT * FROM dai_gia WHERE sku =?`, [sku]);
          const gid = checkRows.length > 0 ? checkRows[0].id : "";
          if (gid === "") {
            const data = helper.getInsertString(temp);
            if (data) await q(`INSERT INTO dai_gia (${data[0]}) VALUES (${data[1]})`);
          } else {
            const values = helper.getUpdateString(temp);
            if (values) await q(`UPDATE dai_gia SET ${values} WHERE id=?`, [gid]);
          }
        }

        if (spid.length === 0) {
          return "No valid CSV GIA data found in file.";
        }
        return { success: true, updatedCount: spid.length, message: `Processed ${spid.length} CSV GIA row(s) successfully !!!` };
      }

      return 1;
    });
  }
}

module.exports = BulkModel;

