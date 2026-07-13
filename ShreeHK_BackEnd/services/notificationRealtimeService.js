const subscribersByCompany = new Map();

const ensureBucket = (companyId) => {
  const key = String(companyId || 0);
  if (!subscribersByCompany.has(key)) {
    subscribersByCompany.set(key, new Set());
  }
  return subscribersByCompany.get(key);
};

const addSubscriber = (companyId, res) => {
  const bucket = ensureBucket(companyId);
  bucket.add(res);
};

const removeSubscriber = (companyId, res) => {
  const key = String(companyId || 0);
  const bucket = subscribersByCompany.get(key);
  if (!bucket) return;
  bucket.delete(res);
  if (!bucket.size) subscribersByCompany.delete(key);
};

const publishToCompany = (companyId, payload) => {
  const bucket = subscribersByCompany.get(String(companyId || 0));
  if (!bucket || !bucket.size) return;
  const body = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of bucket) {
    try {
      res.write(body);
    } catch {
      bucket.delete(res);
    }
  }
};

const getSubscriberCount = (companyId) => {
  const bucket = subscribersByCompany.get(String(companyId || 0));
  return bucket ? bucket.size : 0;
};

module.exports = {
  addSubscriber,
  removeSubscriber,
  publishToCompany,
  getSubscriberCount,
};

