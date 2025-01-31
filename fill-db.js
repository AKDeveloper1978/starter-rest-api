import DynamoDb from "@cyclic.sh/dynamodb";

import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import { faker } from "@faker-js/faker";

export const bikeAccessor = () => {
  const type = faker.vehicle.bicycle();

  const title = type + " " + faker.vehicle.model();
  const handle = slugify(title).toLocaleLowerCase();

  const minPrice = faker.number.int({
    min: 800,
    max: 3000,
  });
  const maxPrice = faker.number.int({
    min: minPrice,
    max: minPrice * 2,
  });

  return {
    id: uuidv4(),
    title,
    handle,
    productType: type,
    createdAt: String(faker.date.anytime()),
    description: faker.lorem.paragraph(),
    vendor: faker.vehicle.manufacturer(),
    availableForSale: faker.datatype.boolean(),
    totalInventory: faker.number.int({ min: 1, max: 5 }),
    priceRange: {
      minPrice: {
        amount: minPrice,
        currencyCode: "USD",
      },
      maxPrice: {
        amount: maxPrice,
        currencyCode: "USD",
      },
    },
  };
};

async function fillDataBaseWithBikes() {
  const totalBikes = 25;
  const randomBikes = Array(totalBikes).fill({}).map(bikeAccessor);

  const db = DynamoDb(process.env.CYCLIC_DB);
  const bikesCollection = db.collection("bikes");

  await Promise.allSettled(
    randomBikes.map((bike) => bikesCollection.set(bike.id, bike))
  );
  console.log(`Added ${totalBikes} new bikes.`);
}

fillDataBaseWithBikes();