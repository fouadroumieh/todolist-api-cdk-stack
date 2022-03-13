const AWS = require("aws-sdk");
const ddbClient = new AWS.DynamoDB.DocumentClient();

async function getItems() {
  try {
    const data = await ddbClient
      .scan({ TableName: "todo-items-ddb-table" })
      .promise();

    return data;
  } catch (err) {
    return err;
  }
}

exports.main = async (event, context, callback) => {
  try {
    const data = await getItems();

    return {
      body: JSON.stringify(data),
    };
  } catch (err) {
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: err,
      }),
    });
  }
};
