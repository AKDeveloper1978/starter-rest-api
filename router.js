import { Router } from "express";
import DynamoDb from '@cyclic.sh/dynamodb';
import { Record, String, Number, Boolean } from 'runtypes';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { authenticateUser } from "./auth.js";

export const router = Router();

const Money = Record({
  amount: Number, 
  currencyCode: String,
});
const PriceRange = Record({
  minPrice: Money, 
  maxPrice: Money, 
});
const BikeData = Record({
  title: String,
  productType: String, 
  createdAt: String,
  description: String,
  vendor: String,
  availableForSale: Boolean, 
  totalInventory: Number, 
  priceRange: PriceRange, 
});

const db = DynamoDb(process.env.CYCLIC_DB);
const bikesCollection = db.collection("bikes");

router.get("/all", authenticateUser, async (req, res) => {
  const { results: bikesMetadata } = await bikesCollection.list();

  const bikes = await Promise.all(
    bikesMetadata.map(async ({ key }) => (await bikesCollection.get(key)).props)
  );

  res.send(bikes);
});

router.get('/by-handle/:handle', authenticateUser, async (req, res) => {
  const handle = req.params.handle;

  try {

    const apiResult = await bikesCollection.filter({ handle });
    console.log(`APIResult:${JSON.stringify(apiResult, null, 2)}`);
    const { results } = apiResult;
    if (!results.length) throw new Error();

    const { props: bike } = results[0];

    return res.send(bike);
  } catch(err) {
    console.log(`GET /bikes/by-handle/${handle}`, err.message);
    return res.sendStatus(404);
  }
});

router.get('/search/by-title', authenticateUser, async (req, res) => {
  const query = req.query.query || "";

  try {
    const { results } = await bikesCollection.parallel_scan({
      expression: "contains(#title, :title)", 
      attr_names: {
        "#title": "title", 
      }, 
      attr_vals: {
        ":title": query
      }
    });

    const bikes = results.map(({ props }) => props);

    res.send(bikes);
  } catch(err) {
    console.log(`GET /bikes/search/by-title term="${query}"`, err.message);

    res.sendStatus(400);
  }
});

router.get('/:id', authenticateUser, async (req, res) => {
  const id = req.params.id;
  console.log(`リクエストid:${id}`);
  const { props: bike } = await bikesCollection.get(id);
  console.log(`取得データ:${JSON.stringify(bike)}`);
  res.send(bike);
});

router.post("/", authenticateUser, async(req, res) => {
  const bikeData = req.body;
  try {
    if (!req.body) throw new Error();

    const bikeObject = BikeData.check(bikeData);
    const bikeId = uuidv4();
    const bikeHandle = slugify(bikeObject.title).toLowerCase();

    const bike = {
      ...bikeObject, 
      id: bikeId, 
      handle: bikeHandle, 
    };

    await bikesCollection.set(bikeId, bike);

    res.send(bike);
  } catch(err) {
    console.log(`POST /bikes/`, err.message);
    res.sendStatus(400);
  }
});

router.put("/:id", authenticateUser, async (req, res) => {
  const bikeId = req.params.id;
  const bikeData = req.body;

  try {
    if (!req.body) throw new Error();
    let point = 0
    console.log(`チェックポイント:${++point}`);
    if (!bikeData.id || !bikeData.handle) throw new Error();

    console.log(`チェックポイント:${++point}`);
    const bikeObject = BikeData.check(bikeData);

    console.log(`チェックポイント:${++point}`);
    await bikesCollection.delete(bikeId);

    console.log(`チェックポイント:${++point}`);
    await bikesCollection.set(bikeId, bikeObject);

    console.log(`チェックポイント:${++point}`);
    res.send(bikeObject);
  } catch(err) {
    console.log(`PUT bikes/${bikeId}`, err.message);
    res.sendStatus(404);
  }
});

router.patch('/:id', authenticateUser, async (req, res) => {
  const bikeId = req.params.id;
  const newData = req.body || {};

  try {
    const { props: oldBike } = await bikesCollection.get(bikeId);
    const bike = {
      ...oldBike, 
      ...newData, 
    };

    await bikesCollection.set(bikeId, newData);

    res.send(bike);
  } catch(err) {
    console.log(`PATH /bikes\${bikeId}`, err.message);
    res.sendStatus(404);
  }
});

router.delete("/:id", authenticateUser, async (req, res) => {
  console.log(`deleteきた`);
  const bikeId = req.params.id;

  try {
    await bikesCollection.delete(bikeId);

    res.send({
      id: bikeId, 
    });
  } catch(err) {
    console.log(`DELETE /bikes/${bikeId}`, err.message);
    res.sendStatus(404);
  }
});