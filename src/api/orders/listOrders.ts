/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

async function listOrders(orderId?: string) {
  if (orderId) {
    const params = {
      TableName: process.env.ORDER_TABLE || '',
      Key: { id: orderId },
    };

    try {
      const item = (await docClient.get(params).promise()).Item;
      if (item) {
        item.customer = await getCustomerData(item.customerId);
        delete item.customerId;

        for (let i = 0; i < item.products.length; i++) {
          const productData = await getProductData(item.products[i].productId);
          if (productData) {
            item.products[i].id = productData.id;
            item.products[i].name = productData.name;
            item.products[i].price = productData.price;

            delete item.products[i].productId;
          }
        }

        return [item];
      }

      return [];
    } catch (err) {
      console.log('DynamoDB error: ', err);
      return [];
    }
  } else {
    const params = {
      TableName: process.env.ORDER_TABLE || '',
    };

    try {
      const data = await docClient.scan(params).promise();
      if (data && data.Items) {
        for (let k = 0; k < data.Items.length; k++) {
          const item = data.Items[k];
          item.customer = await getCustomerData(item.customerId);
          delete item.customerId;

          for (let i = 0; i < item.products.length; i++) {
            const productData = await getProductData(item.products[i].productId);
            if (productData) {
              item.products[i].id = productData.id;
              item.products[i].name = productData.name;
              item.products[i].price = productData.price;

              delete item.products[i].productId;
            }
          }
        }

        return data.Items;
      }

      return [];
    } catch (err) {
      console.log('DynamoDB error: ', err);
      return [];
    }
  }
}

async function getCustomerData(customerId: string) {
  const params = {
    TableName: process.env.CUSTOMER_TABLE || '',
    Key: { id: customerId },
  };

  try {
    const { Item } = await docClient.get(params).promise();
    return Item;
  } catch (err) {
    console.log('DynamoDB error: ', err);
    return null;
  }
}

async function getProductData(productId: string) {
  const params = {
    TableName: process.env.PRODUCT_TABLE || '',
    Key: { id: productId },
  };

  try {
    const { Item } = await docClient.get(params).promise();
    return Item;
  } catch (err) {
    console.log('DynamoDB error: ', err);
    return null;
  }
}

export default listOrders;
