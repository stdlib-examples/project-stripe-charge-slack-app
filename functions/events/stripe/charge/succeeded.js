const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
/**
* An HTTP endpoint that acts as a webhook for Stripe charge.succeeded event
* @param {object} charge Stripe charge object from the event
* @param {object} event Stripe charge.succeeded event body (raw)
* @returns {object} result The result of your workflow steps
*/
module.exports = async (charge, event) => {

  // Prepare workflow object to store API responses

  let result = {};

  // [Workflow Step 1]

  console.log(`Running stripe.customers[@0.1.2].identify()...`);

  result.step1 = {};
  result.step1.customer = await lib.stripe.customers['@0.1.2'].identify({
    id: `${charge.customer}`
  });

  // [Workflow Step 2]

  console.log(`Running clearbit.person[@0.1.7].find()...`);

  result.step2 = {};
  result.step2.enrichment = await lib.clearbit.person['@0.1.7'].find({
    email: `${result.step1.customer.email}`
  }).catch(console.log);

  if (!result.step2.enrichment) {
    result.step2.enrichment = {};
  }

  // [Workflow Step 3]

  console.log(`Running airtable.query[@0.3.4].insert()...`);

  result.step3 = {};
  result.step3.insertQueryResult = await lib.airtable.query['@0.3.4'].insert({
    table: `Charges`,
    fields: {
      'Stripe Id': `${charge.id}`,
      'Email': `${result.step1.customer.email}`,
      'Company': `${result.step2.enrichment.company && result.step2.enrichment.company.name}`,
      'Charge Data': `${JSON.stringify(charge, null, 2)}`,
      'User Data': `${JSON.stringify(result.step2.enrichment.person, null, 2)}`
    }
  });

  // [Workflow Step 4]

  let companyName = result.step2.enrichment.company && result.step2.enrichment.company.name;
  let companySize =
    result.step2.enrichment.company &&
    result.step2.enrichment.company.metrics &&
    result.step2.enrichment.company.metrics.employees || 'an unknown number of';

  console.log(`Running slack.channels[@0.6.0].messages.create()...`);

  result.step4 = {};
  result.step4.response = await lib.slack.channels['@0.6.0'].messages.create({
    channel: `#demo`,
    text: `*New Purchase!*`,
    attachments: [{
      text: `${result.step1.customer.email} just paid *$${charge.amount / 100}*`,
      color: '#2EB67D'
    }, {
      text: companyName ? `They appear to work at *${companyName}*, which has *${companySize}* employees` : `We couldn't find out where they work`,
      color: '#ECB22E'
    }]
  });

  return result;
};