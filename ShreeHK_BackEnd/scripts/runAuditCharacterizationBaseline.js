const http = require("http");
const jwt = require("jsonwebtoken");
const path = require("path");
const connection = require("../connection.js");

const SECRET_KEY = process.env.JWT_SECRET || "NitechDigitalServices";
const PORT = 3500;
const COMPANY_ID = 1;
const USER_ID = 1;

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function requestHttp(method, endpoint, body = null, token) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const headers = {
      Authorization: `Bearer ${token}`,
      "x-company-id": String(COMPANY_ID),
    };
    if (postData) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(postData);
    }
    const req = http.request(
      `http://localhost:${PORT}${endpoint}`,
      { method, headers, timeout: 30000 },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            parsed = raw;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getProductSnapshot(productId) {
  const rows = await query(
    `SELECT id, sku, company, group_type, inward, outward, hold, visibility,
            purchased_pcs, purchased_carat, memo_pcs, memo_carat,
            sold_pcs, sold_carat, onhand_pcs, onhand_carat, price, cost, amount
     FROM dai_product WHERE id = ?`,
    [productId]
  );
  return rows[0] || null;
}

async function getHistoryCount(productId) {
  const rows = await query(`SELECT COUNT(*) AS cnt FROM dai_history WHERE product_id = ?`, [productId]);
  return Number(rows[0]?.cnt || 0);
}

async function getAccTransactionCount(voucherId, type) {
  const col = type === "sale" ? "sale_id" : "purchase_id";
  const rows = await query(`SELECT COUNT(*) AS cnt FROM acc_transaction WHERE ${col} = ?`, [String(voucherId)]);
  return Number(rows[0]?.cnt || 0);
}

async function cleanupTestRows() {
  try {
    await query("DELETE FROM dai_product_value WHERE product_id IN (SELECT id FROM dai_product WHERE sku LIKE 'BASE_%')");
    await query("DELETE FROM dai_history WHERE product_id IN (SELECT id FROM dai_product WHERE sku LIKE 'BASE_%')");
    await query("DELETE FROM dai_outward_item WHERE sku LIKE 'BASE_%' OR product_id IN (SELECT id FROM dai_product WHERE sku LIKE 'BASE_%')");
    await query("DELETE FROM dai_outward WHERE invoiceno LIKE 'BASE_%' OR party IN ('BASELINE SUPPLIER', 'CONSIGNOR VENDOR', 'LAB TEST SUPPLIER', 'MEMO VENDOR', 'RETURNABLE VENDOR', 'DEL INWARD VENDOR', 'DEL OUT VENDOR', 'DEL GIA VENDOR', 'MEMO CUSTOMER', 'DIRECT SALE BUYER', 'GIA LAB MUMBAI', 'MEMO PARTY', 'GIA LAB')");
    await query("DELETE FROM dai_inward_item WHERE sku LIKE 'BASE_%'");
    await query("DELETE FROM dai_inward WHERE invoiceno LIKE 'BASE_%' OR party IN ('BASELINE SUPPLIER', 'CONSIGNOR VENDOR', 'LAB TEST SUPPLIER', 'MEMO VENDOR', 'RETURNABLE VENDOR', 'DEL INWARD VENDOR', 'DEL OUT VENDOR', 'DEL GIA VENDOR', 'MEMO CUSTOMER', 'DIRECT SALE BUYER')");
    await query("DELETE FROM acc_transaction WHERE description LIKE '%BASE_%'");
    await query("DELETE FROM dai_product WHERE sku LIKE 'BASE_%'");
  } catch (err) {
    console.error("Cleanup error (non-fatal):", err?.message || err);
  }
}

async function run() {
  console.log("================================================================================");
  console.log("  CHARACTERIZATION BASELINE TEST SUITE (VENYA & FROND / SHREEHK)");
  console.log("  Testing current behavior on LOCAL DB without changing application code");
  console.log("================================================================================\n");

  await cleanupTestRows();

  const token = jwt.sign(
    { user_id: USER_ID, roll: 1, companyId: COMPANY_ID, yearId: 1 },
    SECRET_KEY,
    { expiresIn: "2h" }
  );

  const results = [];
  const timestamp = Date.now();

  try {
    // --------------------------------------------------------------------------
    // FLOW 1: Inward Import (Semi Inward)
    // --------------------------------------------------------------------------
    const importSku = `BASE_IMP_${timestamp}`;
    const importPayload = {
      operating_company_id: COMPANY_ID,
      inward_type: "import",
      invoicedate: "03-11-2026",
      party: "BASELINE SUPPLIER",
      products: [
        {
          sku: importSku,
          group_type: "single",
          polish_pcs: 1,
          polish_carat: 1.5,
          price: 1000,
          amount: 1500,
          cost: 950,
          attr: {
            shape: "ROUND",
            color: "D",
            clarity: "VVS1",
          },
        },
      ],
    };
    const importRes = await requestHttp("POST", "/inward/save", importPayload, token);
    const [importProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [importSku]);
    const importSnapshot = importProd ? await getProductSnapshot(importProd.id) : null;
    const importHist = importProd ? await getHistoryCount(importProd.id) : 0;
    results.push({
      flow: "1. Inward Import (Semi Inward)",
      httpStatus: importRes.status,
      success: importRes.status === 200 && Boolean(importProd),
      snapshot: importSnapshot,
      historyCount: importHist,
    });

    // --------------------------------------------------------------------------
    // FLOW 2: Inward Purchase
    // --------------------------------------------------------------------------
    const purSku = `BASE_PUR_${timestamp}`;
    const purPayload = {
      operating_company_id: COMPANY_ID,
      inward_type: "purchase",
      invoicedate: "03-11-2026",
      party: "BASELINE SUPPLIER",
      products: [
        {
          sku: purSku,
          group_type: "single",
          polish_pcs: 1,
          polish_carat: 2.0,
          price: 2000,
          amount: 4000,
          cost: 1900,
          attr: {
            shape: "ROUND",
            color: "E",
            clarity: "VS1",
          },
        },
      ],
    };
    const purRes = await requestHttp("POST", "/inward/save", purPayload, token);
    const [purProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [purSku]);
    const purSnapshot = purProd ? await getProductSnapshot(purProd.id) : null;
    const purHist = purProd ? await getHistoryCount(purProd.id) : 0;
    results.push({
      flow: "2. Inward Purchase",
      httpStatus: purRes.status,
      success: purRes.status === 200 && Boolean(purProd),
      snapshot: purSnapshot,
      historyCount: purHist,
      inwardId: purProd?.inward_id,
    });

    // --------------------------------------------------------------------------
    // FLOW 3: Consign In (Inward Consign)
    // --------------------------------------------------------------------------
    const consignSku = `BASE_CONSIGN_${timestamp}`;
    const consignPayload = {
      operating_company_id: COMPANY_ID,
      inward_type: "consign",
      invoicedate: "03-11-2026",
      party: "CONSIGNOR VENDOR",
      products: [
        {
          sku: consignSku,
          group_type: "single",
          polish_pcs: 1,
          polish_carat: 3.0,
          price: 1500,
          amount: 4500,
          attr: { shape: "ROUND" },
        },
      ],
    };
    const consignRes = await requestHttp("POST", "/inward/save", consignPayload, token);
    const [consignProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [consignSku]);
    const consignSnapshot = consignProd ? await getProductSnapshot(consignProd.id) : null;
    results.push({
      flow: "3. Consign In (Inward Consignment)",
      httpStatus: consignRes.status,
      success: consignRes.status === 200 && Boolean(consignProd),
      snapshot: consignSnapshot,
    });

    // --------------------------------------------------------------------------
    // FLOW 4: Out Memo
    // --------------------------------------------------------------------------
    // Put importProd on out memo
    const memoPayload = {
      operating_company_id: COMPANY_ID,
      type: "memo",
      party: "MEMO CUSTOMER",
      invoicedate: "03-11-2026",
      record: [{ id: importProd.id, polish_pcs: 1, polish_carat: 1.5, price: 1200, amount: 1800 }],
    };
    const memoRes = await requestHttp("POST", "/outward/sendTo", memoPayload, token);
    const memoSnapshot = await getProductSnapshot(importProd.id);
    const [memoOutward] = await query(
      "SELECT * FROM dai_outward WHERE FIND_IN_SET(?, products) AND type = 'memo' ORDER BY id DESC LIMIT 1",
      [importProd.id]
    );
    results.push({
      flow: "4. Out Memo",
      httpStatus: memoRes.status,
      success: memoRes.status === 200 && memoSnapshot?.outward === "memo",
      snapshot: memoSnapshot,
      outwardId: memoOutward?.id,
    });

    // --------------------------------------------------------------------------
    // FLOW 5: Memo-to-Sale
    // --------------------------------------------------------------------------
    let saleRes = { status: 500 };
    let saleSnapshot = null;
    if (memoOutward) {
      const memoToSalePayload = {
        operating_company_id: COMPANY_ID,
        memo_id: memoOutward.id,
        type: "sale",
        shipping_name: "FEDEX",
        origin_of: "INDIA",
        party: "MEMO CUSTOMER",
        products: [importProd.id],
        record: {
          [importProd.id]: { polish_pcs: 1, polish_carat: 1.5, price: 1250, amount: 1875 },
        },
      };
      saleRes = await requestHttp("POST", "/transaction/outward-stock/memo-to-sale", memoToSalePayload, token);
      saleSnapshot = await getProductSnapshot(importProd.id);
    }
    const [saleOutward] = await query(
      "SELECT * FROM dai_outward WHERE FIND_IN_SET(?, products) AND type = 'sale' ORDER BY id DESC LIMIT 1",
      [importProd.id]
    );
    results.push({
      flow: "5. Memo-to-Sale Conversion",
      httpStatus: saleRes.status,
      success: saleRes.status === 200 && saleSnapshot?.outward === "sale",
      snapshot: saleSnapshot,
      saleOutwardId: saleOutward?.id,
    });

    // --------------------------------------------------------------------------
    // FLOW 6: Direct Sale
    // --------------------------------------------------------------------------
    const directSalePayload = {
      operating_company_id: COMPANY_ID,
      type: "sale",
      party: "DIRECT SALE BUYER",
      invoicedate: "03-11-2026",
      record: [{ id: purProd.id, polish_pcs: 1, polish_carat: 2.0, price: 2500, amount: 5000 }],
    };
    const directSaleRes = await requestHttp("POST", "/outward/sendTo", directSalePayload, token);
    const directSaleSnapshot = await getProductSnapshot(purProd.id);
    const [directSaleOutward] = await query(
      "SELECT * FROM dai_outward WHERE FIND_IN_SET(?, products) AND type = 'sale' ORDER BY id DESC LIMIT 1",
      [purProd.id]
    );
    results.push({
      flow: "6. Direct Sale",
      httpStatus: directSaleRes.status,
      success: directSaleRes.status === 200 && directSaleSnapshot?.outward === "sale",
      snapshot: directSaleSnapshot,
      outwardId: directSaleOutward?.id,
    });

    // --------------------------------------------------------------------------
    // FLOW 7: Send to Lab & returnGia
    // --------------------------------------------------------------------------
    // Create new stone for Lab flow
    const labSku = `BASE_LAB_${timestamp}`;
    await requestHttp(
      "POST",
      "/inward/save",
      {
        operating_company_id: COMPANY_ID,
        inward_type: "purchase",
        invoicedate: "03-11-2026",
        party: "LAB TEST SUPPLIER",
        products: [{ sku: labSku, group_type: "single", polish_pcs: 1, polish_carat: 1.0, price: 800, amount: 800 }],
      },
      token
    );
    const [labProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [labSku]);

    // Send to Lab
    const sendLabRes = await requestHttp(
      "POST",
      "/outward/sendTo",
      {
        operating_company_id: COMPANY_ID,
        type: "lab",
        lab: "GIA",
        party: "GIA LAB MUMBAI",
        invoicedate: "03-11-2026",
        record: [{ id: labProd.id, polish_pcs: 1, polish_carat: 1.0, price: 800, amount: 800 }],
      },
      token
    );
    const [labOutward] = await query(
      "SELECT * FROM dai_outward WHERE FIND_IN_SET(?, products) AND type = 'lab' ORDER BY id DESC LIMIT 1",
      [labProd.id]
    );
    const sentLabSnapshot = await getProductSnapshot(labProd.id);

    // returnGia
    let returnGiaRes = { status: 500 };
    if (labOutward) {
      returnGiaRes = await requestHttp(
        "POST",
        "/transaction/gia/return",
        {
          id: labOutward.id,
          record: {
            [labProd.id]: {
              sku: labSku,
              report: "GIA-2489999",
              color: "D",
              intensity: "NONE",
              overtone: "NONE",
            },
          },
        },
        token
      );
    }
    const returnedLabSnapshot = await getProductSnapshot(labProd.id);
    results.push({
      flow: "7. Lab Send & returnGia",
      httpStatus: returnGiaRes.status,
      success: returnGiaRes.status === 200 && returnedLabSnapshot?.outward === "",
      sentSnapshot: sentLabSnapshot,
      returnedSnapshot: returnedLabSnapshot,
    });

    // --------------------------------------------------------------------------
    // FLOW 8: Inward Memo-to-Purchase
    // --------------------------------------------------------------------------
    // Create stone on Inward Memo
    const inMemoSku = `BASE_INMEMO_${timestamp}`;
    await requestHttp(
      "POST",
      "/inward/save",
      {
        operating_company_id: COMPANY_ID,
        inward_type: "memo",
        invoicedate: "03-11-2026",
        party: "MEMO VENDOR",
        products: [{ sku: inMemoSku, group_type: "single", polish_pcs: 1, polish_carat: 2.5, price: 1000, amount: 2500 }],
      },
      token
    );
    const [inMemoProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [inMemoSku]);
    const inMemoVoucherId = inMemoProd?.inward_id;

    // Convert inward memo to purchase
    let inMemoToPurRes = { status: 500 };
    if (inMemoVoucherId) {
      inMemoToPurRes = await requestHttp(
        "POST",
        "/transaction/inward-stock/memo-to-purchase",
        {
          operating_company_id: COMPANY_ID,
          memo_id: inMemoVoucherId,
          products: [inMemoProd.id],
          record: { [inMemoProd.id]: { price: 1050 } },
        },
        token
      );
    }
    const inMemoConvertedSnapshot = await getProductSnapshot(inMemoProd.id);
    results.push({
      flow: "8. Inward Memo-to-Purchase Conversion",
      httpStatus: inMemoToPurRes.status,
      success: inMemoToPurRes.status === 200 && inMemoConvertedSnapshot?.inward === "",
      snapshot: inMemoConvertedSnapshot,
    });

    // --------------------------------------------------------------------------
    // FLOW 9: returnInwardMemo
    // --------------------------------------------------------------------------
    const returnMemoSku = `BASE_RET_MEMO_${timestamp}`;
    await requestHttp(
      "POST",
      "/inward/save",
      {
        operating_company_id: COMPANY_ID,
        inward_type: "memo",
        invoicedate: "03-11-2026",
        party: "RETURNABLE VENDOR",
        products: [{ sku: returnMemoSku, group_type: "single", polish_pcs: 1, polish_carat: 1.2, price: 700, amount: 840 }],
      },
      token
    );
    const [retMemoProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [returnMemoSku]);
    const retMemoVoucherId = retMemoProd?.inward_id;

    let retInMemoRes = { status: 500 };
    if (retMemoVoucherId) {
      retInMemoRes = await requestHttp(
        "POST",
        "/transaction/inward-stock/return",
        {
          id: retMemoVoucherId,
          products: [retMemoProd.id],
        },
        token
      );
    }
    const retInMemoSnapshot = await getProductSnapshot(retMemoProd.id);
    results.push({
      flow: "9. returnInwardMemo",
      httpStatus: retInMemoRes.status,
      success: retInMemoRes.status === 200 && retInMemoSnapshot?.visibility === 0,
      snapshot: retInMemoSnapshot,
    });

    // --------------------------------------------------------------------------
    // FLOW 10: 3 Delete Flows (deleteInwardStock, deleteOutwardStock, deleteGia)
    // --------------------------------------------------------------------------
    // 10a. deleteInwardStock (on un-outwarded purchase)
    const delInwardSku = `BASE_DEL_IN_${timestamp}`;
    await requestHttp(
      "POST",
      "/inward/save",
      {
        operating_company_id: COMPANY_ID,
        inward_type: "purchase",
        invoicedate: "03-11-2026",
        party: "DEL INWARD VENDOR",
        products: [{ sku: delInwardSku, group_type: "single", polish_pcs: 1, polish_carat: 0.9, price: 500, amount: 450 }],
      },
      token
    );
    const [delInProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [delInwardSku]);
    const delInVoucherId = delInProd?.inward_id;
    const delInwardRes = await requestHttp(
      "DELETE",
      `/transaction/inward-stock?deleteId=${delInVoucherId}`,
      null,
      token
    );
    const delInwardAfter = await query("SELECT deleted FROM dai_inward WHERE id = ?", [delInVoucherId]);

    // 10b. deleteOutwardStock
    // Create stone and memo
    const delOutSku = `BASE_DEL_OUT_${timestamp}`;
    await requestHttp(
      "POST",
      "/inward/save",
      {
        operating_company_id: COMPANY_ID,
        inward_type: "purchase",
        invoicedate: "03-11-2026",
        party: "DEL OUT VENDOR",
        products: [{ sku: delOutSku, group_type: "single", polish_pcs: 1, polish_carat: 0.8, price: 400, amount: 320 }],
      },
      token
    );
    const [delOutProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [delOutSku]);
    const delSendToRes = await requestHttp(
      "POST",
      "/outward/sendTo",
      {
        operating_company_id: COMPANY_ID,
        type: "memo",
        party: "MEMO PARTY",
        invoicedate: "03-11-2026",
        record: [{ id: delOutProd.id, polish_pcs: 1, polish_carat: 0.8, price: 400, amount: 320 }],
      },
      token
    );
    const [delOutVoucher] = await query(
      "SELECT * FROM dai_outward WHERE FIND_IN_SET(?, products) AND type = 'memo' ORDER BY id DESC LIMIT 1",
      [delOutProd.id]
    );
    const delOutwardRes = await requestHttp(
      "DELETE",
      `/transaction/outward-stock?deleteId=${delOutVoucher.id}`,
      null,
      token
    );
    const delOutwardProdAfter = await getProductSnapshot(delOutProd.id);

    // 10c. deleteGia
    // Send to lab, then delete gia outward
    const delGiaSku = `BASE_DEL_GIA_${timestamp}`;
    await requestHttp(
      "POST",
      "/inward/save",
      {
        operating_company_id: COMPANY_ID,
        inward_type: "purchase",
        invoicedate: "03-11-2026",
        party: "DEL GIA VENDOR",
        products: [{ sku: delGiaSku, group_type: "single", polish_pcs: 1, polish_carat: 1.1, price: 600, amount: 660 }],
      },
      token
    );
    const [delGiaProd] = await query("SELECT * FROM dai_product WHERE sku = ?", [delGiaSku]);
    await requestHttp(
      "POST",
      "/outward/sendTo",
      {
        operating_company_id: COMPANY_ID,
        type: "lab",
        lab: "GIA",
        party: "GIA LAB",
        invoicedate: "03-11-2026",
        record: [{ id: delGiaProd.id, polish_pcs: 1, polish_carat: 1.1, price: 600, amount: 660 }],
      },
      token
    );
    const [delGiaVoucher] = await query(
      "SELECT * FROM dai_outward WHERE FIND_IN_SET(?, products) AND type = 'lab' ORDER BY id DESC LIMIT 1",
      [delGiaProd.id]
    );
    const delGiaRes = await requestHttp("DELETE", `/transaction/gia?deleteId=${delGiaVoucher.id}`, null, token);
    const delGiaProdAfter = await getProductSnapshot(delGiaProd.id);

    results.push({
      flow: "10. Delete Flows",
      deleteInwardStock: {
        httpStatus: delInwardRes.status,
        inwardDeleted: delInwardAfter[0]?.deleted === 1,
      },
      deleteOutwardStock: {
        httpStatus: delOutwardRes.status,
        outwardRestoredToBlank: delOutwardProdAfter?.outward === "",
      },
      deleteGia: {
        httpStatus: delGiaRes.status,
        giaRestoredToBlank: delGiaProdAfter?.outward === "",
      },
      success:
        delInwardRes.status === 200 &&
        delOutwardRes.status === 200 &&
        delGiaRes.status === 200 &&
        delOutwardProdAfter?.outward === "" &&
        delGiaProdAfter?.outward === "",
    });

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Baseline test error:", err);
  } finally {
    process.exit(0);
  }
}

run();
