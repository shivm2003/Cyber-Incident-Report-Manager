/* eslint-disable no-unused-expressions */

const chai = require('chai')
chai.use(require('chai-http'))
const expect = chai.expect

const constants = require('../constants.js')
const app = require('../../../src/index.js')

describe('Test get /cve_count for CVE records', () => {
  context('Positive Tests', () => {
    it('Get /cve_count should allow any user to get count', async () => {
      await chai.request(app)
        .get('/api/cve_count')
        .then((res, err) => {
          expect(err).to.be.undefined
          expect(res).to.have.status(200)
          expect(res.body).to.have.property('totalCount').that.is.a('number')
        })
    })
    it('Get /cve_count should allow privledged user to get count also', async () => {
      await chai.request(app)
        .get('/api/cve_count')
        .set(constants.headers)
        .then((res, err) => {
          expect(err).to.be.undefined
          expect(res).to.have.status(200)
          expect(res.body).to.have.property('totalCount').that.is.a('number')
        })
    })
    it('Get /cve_count should return count with valid parameters', async () => {
      await chai.request(app)
        .get('/api/cve_count?state=PUBLISHED')
        .set(constants.headers)
        .then((res, err) => {
          expect(err).to.be.undefined
          expect(res).to.have.status(200)
          expect(res.body).to.have.property('totalCount').that.is.a('number')
        })
    })
  })
  context('Negative Tests', () => {
    it('Get /cve should NOT allow any user to get count', async () => {
      await chai.request(app)
        .get('/api/cve?count_only=1')
        .then((res, err) => {
          expect(err).to.be.undefined
          expect(res).to.have.status(400)
        })
    })
    it('Get /cve_count should fail if it is passed invalid parameters', async () => {
      await chai.request(app)
        .get('/api/cve_count?time_modified.gt=2022-13-01T00:00:00Z')
        .set(constants.headers)
        .then((res, err) => {
          expect(err).to.be.undefined
          expect(res).to.have.status(400)
          expect(res.body.message).to.contain('Parameters were invalid')
        })
    })
    it('Get /cve_count should fail if it is `state` parameter value is invalid ', async () => {
      await chai.request(app)
        .get('/api/cve_count?state=SUCESS')
        .set(constants.headers)
        .then((res, err) => {
          expect(err).to.be.undefined
          expect(res).to.have.status(400)
          expect(res.body.message).to.contain('Parameters were invalid')
        })
    })
  })
})
