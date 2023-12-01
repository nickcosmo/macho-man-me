import functions from '@google-cloud/functions-framework';
import { Configuration, OpenAIApi } from 'openai';
import { createHmac } from 'crypto';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const validateReq = (req) => {
  if (process.env.NODE_ENV !== 'dev') {
    const timestamp = req.headers['x-slack-request-timestamp'];
    const slackSignature = req.headers['x-slack-signature'];
    const rawBody = req.rawBody;
    const baseString = `v0:${timestamp}:${rawBody}`;

    const hash =
      'v0=' +
      createHmac('sha256', process.env.SLACK_SIGNING_SECRET).update(baseString).digest('hex');

    if (hash !== slackSignature) {
      throw new Error('Signatures do not match. Aborting operation.');
    }
  }
};

functions.http('run', async (req, res) => {
  try {
    validateReq(req);
  } catch (e) {
    console.log('failed validation');
    return res.status(500).json({ message: 'error - signature mismatch' });
  }
  console.log('validated');
  const { text } = req.body;
  if (text) {
    const prompt = `Rewrite the following in the persona of Macho Man Randy Savage: ${text}`;
    try {
      const completion = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        temperature: 0.6,
        max_tokens: 2000,
      });
      console.log('sending back');
      return res.status(200).json({
        response_type: 'ephemeral',
        text: completion.data.choices[0].text,
      });
    } catch (e) {
      return res.status(200).json({
        response_type: 'ephemeral',
        text: `something went wrong: ${e.message}`,
      });
    }
  } else {
    console.log('error');
    return res.status(500).json({
      response_type: 'ephemeral',
      text: 'error - no message body',
    });
  }
});
