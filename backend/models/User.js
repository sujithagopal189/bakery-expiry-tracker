const { getDb } = require('../db');

const User = {
  async findOne(filter = {}) {
    const db = getDb();
    let query = db.collection('users');

    if (filter.email) {
      const email = String(filter.email).toLowerCase().trim();
      const snapshot = await query.where('email', '==', email).limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, _id: doc.id, ...doc.data() };
    }

    if (filter._id || filter.id) {
      return this.findById(filter._id || filter.id);
    }

    const snapshot = await query.limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, _id: doc.id, ...doc.data() };
  },

  async findById(id) {
    const db = getDb();
    const doc = await db.collection('users').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, _id: doc.id, ...doc.data() };
  },

  async find(filter = {}) {
    const db = getDb();
    let query = db.collection('users');
    if (filter.role) {
      query = query.where('role', '==', filter.role);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }));
  },

  async create(data) {
    const db = getDb();
    const docData = {
      user_name: data.user_name || data.name || 'User',
      email: String(data.email || '').toLowerCase().trim(),
      password: data.password,
      role: data.role || 'user',
      created_at: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString()
    };
    const docRef = await db.collection('users').add(docData);
    return { id: docRef.id, _id: docRef.id, ...docData };
  },

  async updateById(id, data) {
    const db = getDb();
    await db.collection('users').doc(String(id)).set(data, { merge: true });
    return this.findById(id);
  }
};

module.exports = User;