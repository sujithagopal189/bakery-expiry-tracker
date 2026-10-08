const { getDb } = require('../db');

const Inventory = {
  async create(data) {
    const db = getDb();
    const docData = {
      product_id: String(data.product_id),
      quantity_available: Number(data.quantity_available || 0),
      last_updated: data.last_updated ? new Date(data.last_updated).toISOString() : new Date().toISOString()
    };
    const docRef = await db.collection('inventory').add(docData);
    return { id: docRef.id, _id: docRef.id, ...docData };
  },

  async find(filter = {}) {
    const db = getDb();
    let query = db.collection('inventory');
    if (filter.product_id) {
      query = query.where('product_id', '==', String(filter.product_id));
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));
  },

  async findOne(filter = {}) {
    const items = await this.find(filter);
    return items.length > 0 ? items[0] : null;
  },

  async findOneAndUpdate(filter = {}, updateData = {}, options = {}) {
    const db = getDb();
    let query = db.collection('inventory');
    if (filter.product_id) {
      query = query.where('product_id', '==', String(filter.product_id));
    }
    const snapshot = await query.limit(1).get();

    const sanitizedData = { ...updateData };
    if (sanitizedData.last_updated instanceof Date) {
      sanitizedData.last_updated = sanitizedData.last_updated.toISOString();
    }

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.set(sanitizedData, { merge: true });
      const updated = await docRef.get();
      return { id: updated.id, _id: updated.id, ...updated.data() };
    } else {
      const newDoc = {
        product_id: String(filter.product_id || ''),
        ...sanitizedData
      };
      const docRef = await db.collection('inventory').add(newDoc);
      return { id: docRef.id, _id: docRef.id, ...newDoc };
    }
  },

  async deleteMany(filter = {}) {
    const db = getDb();
    let query = db.collection('inventory');
    if (filter.product_id) {
      query = query.where('product_id', '==', String(filter.product_id));
    }
    const snapshot = await query.get();
    if (snapshot.empty) return { deletedCount: 0 };

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return { deletedCount: snapshot.size };
  }
};

module.exports = Inventory;
