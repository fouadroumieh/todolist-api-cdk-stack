const AWS = require("aws-sdk");
const ddbClient = new AWS.DynamoDB.DocumentClient();

async function getItem(id) {
  try {
    const params = {
      TableName: "todo-items-ddb-table",
      Key: {
        id: id,
      },
    };
    const data = await ddbClient.get(params).promise();
    return data;
  } catch (err) {
    return err;
  }
}
async function deleteItem(id) {
  try {
    const params = {
      TableName: "todo-items-ddb-table",
      Key: {
        id: id,
      },
    };
    const data = await ddbClient.delete(params).promise();
    return data;
  } catch (err) {
    return err;
  }
}

exports.main = async (event, context, callback) => {
  try {
    //Check if id is passed
    if (
      event.pathParameters == undefined ||
      event.pathParameters.id == undefined
    )
      callback(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        statusCode: 500,
        body: JSON.stringify({
          message: "Id is empty.",
        }),
      });
    const id = event.pathParameters.id;
    const data = await getItem(id);
    if (data != null && data.Item != null) {
      await deleteItem(id);

      return {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: `Todo item ${id} delete successfully.`,
        }),
      };
    }
    callback(null, {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Todo Item not found.",
      }),
    });
  } catch (err) {
    callback(null, {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: err,
      }),
    });
  }
};
