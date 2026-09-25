import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const API = "https://script.google.com/macros/s/AKfycbymvg-Pja6ObGcHZ07-M2PEDGl2WuotPGPLOMhV5QN27JCtwxdHja9yYZ3M6TeWL0LARw/exec"; // Pon aquí tu URL de Apps Script

// Obtener ventas
app.get('/ventas', async (req, res) => {
  try {
    const r = await fetch(API);
    const data = await r.text(); // Apps Script devuelve JSON
    res.send(data);
  } catch (err) {
    res.status(500).send({ok:false, message: err.message});
  }
});

// Guardar venta (POST)
app.post('/ventas', async (req, res) => {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(req.body)
    });
    const data = await r.text();
    res.send(data);
  } catch (err) {
    res.status(500).send({ok:false, message: err.message});
  }
});

app.listen(3000, () => console.log('Proxy corriendo en http://localhost:3000'));
