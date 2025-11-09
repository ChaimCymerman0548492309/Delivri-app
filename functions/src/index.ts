import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

export const proxyPhoton = functions.https.onRequest(async (req, res) => {
  const url = 'https://photon.komoot.io' + req.url;
  const r = await fetch(url);
  const data = await r.text();
  res.set('Access-Control-Allow-Origin', '*');
  res.status(r.status).send(data);
});

export const proxyNominatim = functions.https.onRequest(async (req, res) => {
  const url = 'https://nominatim.openstreetmap.org' + req.url;
  const r = await fetch(url);
  const data = await r.text();
  res.set('Access-Control-Allow-Origin', '*');
  res.status(r.status).send(data);
});
