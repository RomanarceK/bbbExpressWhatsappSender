const express = require('express');
const router = express.Router();
const { connectToDatabase, getCollection } = require('../mongodb');

router.get('/get-users', async (req, res) => {
  try {
    await connectToDatabase();
    const usersCollection = getCollection('users');
    const users = await usersCollection.find({}).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios.' });
  }
});

router.get('/get-user/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    await connectToDatabase();
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ user_id });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario.' });
  }
});

router.post('/create-user', async (req, res) => {
  const userData = req.body;

  try {
    await connectToDatabase();
    const usersCollection = getCollection('users');

    const existingUser = await usersCollection.findOne({
      $or: [
        { user_id: userData.user_id },
        { email: userData.email }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Usuario ya existe con el mismo ID o email.',
        user: existingUser
      });
    }

    const formattedData = {
      ...userData,
      role: "viewer",
      client: "",
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await usersCollection.insertOne(formattedData);

    if (result.acknowledged) {
      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: { ...formattedData, _id: result.insertedId }
      });
    } else {
      res.status(500).json({ message: 'Error al crear el usuario.' });
    }
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario.' });
  }
});

router.post('/update-profile', async (req, res) => {
  const { user_id, email, username, phone, address } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'Los campos obligatorios son: user_id, email y username.' });
  }

  try {
    await connectToDatabase();
    const usersCollection = getCollection('users');
    const existingUser = await usersCollection.findOne({ user_id });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const updatedData = {
      email,
      username,
      phone: phone || existingUser.phone,
      address: address || existingUser.address,
      updated_at: new Date()
    };

    const result = await usersCollection.updateOne(
      { user_id },
      { $set: updatedData }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({
        message: 'Perfil actualizado exitosamente',
        user: { ...existingUser, ...updatedData }
      });
    } else {
      res.status(500).json({ message: 'No se pudo actualizar el perfil.' });
    }
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil.' });
  }
});

module.exports = router;