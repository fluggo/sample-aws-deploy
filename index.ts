import * as request from 'request';
import { SNSHandler } from 'aws-lambda';

const roomID = process.env.ROOM_ID;

const int = request.defaults({
  baseUrl: 'https://api.ciscospark.com/v1/',
  headers: {
    Authorization: `Bearer ${process.env.BOT_ACCESS_TOKEN}`
  },
  json: true,
});

const sendMessage: SNSHandler = function _sendMessage(event, context, callback) {
  for(const record of event.Records) {
    console.log(JSON.stringify(record.Sns, null, 2));

    int.post('messages', {
      body: {
        roomId: roomID,
        markdown: `Test message`}
    }, (err, resp) => {
      if(resp)
        console.log(JSON.stringify(resp.body, null, 2));

      callback(err);
    });
  }
};

export { sendMessage };
