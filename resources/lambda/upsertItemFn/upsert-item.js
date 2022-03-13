const AWS = require("aws-sdk");
const ddbClient = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

async function upsertItem(id, title, description) {
  try {
    const params = {
      TableName: "todo-items-ddb-table",
      Item: {
        id: id,
        title: title,
        description: description,
        updated_at: new Date().toUTCString(),
      },
    };
    await ddbClient.put(params).promise();
  } catch (err) {
    return err;
  }
}
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
exports.main = async (event, context, callback) => {
  try {
    var id;
    //If id exists use for update otherwise create new
    let request = JSON.parse(event.body);
    if (event.httpMethod == "POST") id = uuidv4();
    else {
      id = event.pathParameters.id;
      const data = await getItem(id);
      if (data == null || data.Item == null) {
        callback(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          statusCode: 404,
          body: JSON.stringify({
            message: "Todo Item not found.",
          }),
        });
      }
    }

    await upsertItem(id, request.title, request.description);
    return {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Todo Item created/updated successfully!",
      }),
    };
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
