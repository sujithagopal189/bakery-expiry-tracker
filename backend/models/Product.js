const { getDb } = require('../db');

function createSortableQuery(fetchFn) {
  let sortCriteria = null;
  return {
    sort(criteria) {
      sortCriteria = criteria;
      return this;
    },
    async then(resolve, reject) {
      try {
        const items = await fetchFn();
        if (sortCriteria && typeof sortCriteria === 'object') {
          const [key, dir] = Object.entries(sortCriteria)[0] || [];
          if (key) {
            items.sort((a, b) => {
              const valA = a[key] !== undefined ? a[key] : '';
              const valB = b[key] !== undefined ? b[key] : '';
              const cmp = valA > valB ? 1 : valA < valB ? -1 : 0;
              return (dir === -1 || dir === 'desc') ? -cmp : cmp;
            });
          }
        }
        resolve(items);
      } catch (err) {
        if (reject) reject(err);
        else throw err;
      }
    },
    async catch(reject) {
      return this.then(undefined, reject);
    }
  };
}

const Product = {
  find(filter = {}) {
    return createSortableQuery(async () => {
      const db = getDb();
      let query = db.collection('products');

      if (filter.category) {
        query = query.where('category', '==', filter.category);
      }
      if (filter.status) {
        query = query.where('status', '==', filter.status);
      }

      const snapshot = await query.get();
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        _id: doc.id,
        ...doc.data()
      }));

      // Default sort by created_at desc
      products.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return products;
    });
  },

  async findById(id) {
    const db = getDb();
    const doc = await db.collection('products').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, _id: doc.id, ...doc.data() };
  },

  async findOne(filter = {}) {
    const db = getDb();
    let query = db.collection('products');

    if (filter._id || filter.id) {
      return this.findById(filter._id || filter.id);
    }

    if (filter.product_name) {
      query = query.where('product_name', '==', filter.product_name);
    }

    const snapshot = await query.get();
    if (snapshot.empty) return null;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let matches = true;
      for (const [key, val] of Object.entries(filter)) {
        if (key === 'created_at') {
          const t1 = new Date(data[key]).getTime();
          const t2 = new Date(val).getTime();
          if (t1 !== t2) matches = false;
        } else if (data[key] !== val) {
          matches = false;
        }
      }
      if (matches) {
        return { id: doc.id, _id: doc.id, ...data };
      }
    }

    return null;
  },

  async create(data) {
    const db = getDb();
    const now = new Date().toISOString();
    const docData = {
      product_name: data.product_name || '',
      category: data.category || 'General',
      manufacturing_date: data.manufacturing_date || '',
      expiry_date: data.expiry_date || '',
      quantity: Number(data.quantity || 0),
      status: data.status || 'fresh',
      created_at: data.created_at ? new Date(data.created_at).toISOString() : now,
      updated_at: data.updated_at ? new Date(data.updated_at).toISOString() : now
    };
    const docRef = await db.collection('products').add(docData);
    return { id: docRef.id, _id: docRef.id, ...docData };
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const db = getDb();
    const docRef = db.collection('products').doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const sanitizedData = { ...updateData };
    delete sanitizedData.id;
    delete sanitizedData._id;

    if (sanitizedData.updated_at instanceof Date) {
      sanitizedData.updated_at = sanitizedData.updated_at.toISOString();
    } else if (!sanitizedData.updated_at) {
      sanitizedData.updated_at = new Date().toISOString();
    }

    await docRef.set(sanitizedData, { merge: true });
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, _id: updatedDoc.id, ...updatedDoc.data() };
  },

  async findByIdAndDelete(id) {
    const db = getDb();
    const docRef = db.collection('products').doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const data = { id: doc.id, _id: doc.id, ...doc.data() };
    await docRef.delete();
    return data;
  }
};

module.exports = Product;