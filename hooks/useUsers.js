const { connectToDatabase, getCollection } = require("../mongodb");

async function findOrCreateUser(profile) {
    const db = await connectToDatabase();
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ user_id: profile.sub });
    
    if (!user) {
      const newUser = {
        user_id: profile.sub,
        username: profile.name,
        email: profile.email,
        rol: "viewer",
        cliente: "",
        created_at: new Date(),
        active: true
      };
      
      await usersCollection.insertOne(newUser);
      return newUser;
    }
    
    return user;
}

module.exports = { findOrCreateUser };