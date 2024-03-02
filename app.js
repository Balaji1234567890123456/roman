const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const datapath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null
app.use(express.json())
const initialization = async () => {
  try {
    db = await open({
      filename: datapath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('success')
    })
  } catch (e) {
    console.log(`${e.mesage}`)
    process.exit(1)
  }
}
initialization()
const convertStateObject = database => ({
  stateId: database.state_id,
  stateName: database.state_name,
  population: database.population,
})
const convertDistrictObject = database => {
  return {
    districtId: database.district_id,
    districtName: database.district_name,
    stateId: database.state_id,
    cases: database.cases,
    cured: database.cured,
    active: database.active,
    deaths: database.deaths,
  }
}
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const c = `SELECT *
             FROM user
             WHERE username="${username}";

             `
  const d = await db.get(c)
  if (d === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const h = await bcrypt.compare(password, d.password)
    if (h) {
      const payload = {username: username}
      const j = jwt.sign(payload, 'balu')
      response.send({j})
    } else {
      response.send('Invalid Password')
      response.status(400)
    }
  }
})
const vikram = function (request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    const u = authHeader.split(' ')
    jwtToken = u[1]
    if (jwtToken === undefined) {
      response.status(401)
      response.status('Invalid JWT Token')
    } else {
      jwt.verify(jwtToken, 'balu', async (error, payload) => {
        if (error) {
          response.send(401)
        } else {
          next()
        }
      })
    }
  }
}
app.get('/states/', vikram, async (request, response) => {
  const g = `SELECT *
            FROM state;`
  const i = await db.all(g)
  response.send(i.map(eachState => convertStateObject(eachState)))
})
app.get('/states/:state_id/', vikram, async (request, response) => {
  const {state_id} = request.params
  const k = `SELECT *
          FROM state
          WHERE state_id=${state_id};`
  const v = await db.get(k)
  response.send(convertStateObject(v))
})
app.post('/districts/', vikram, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const a = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
          VALUES ("${districtName}",${stateId},${cases},${cured},${active},${deaths});`
  const b = await db.run(a)
  response.send('District Successfully Added')
})
app.get('/districts/:districtId/', vikram, async (request, response) => {
  const {districtId} = request.params
  const a = `SELECT *
           FROM district
           WHERE district_id=${districtId};`
  const b = await db.get(a)
  response.send(convertDistrictObject(b))
})
app.delete('/districts/:districtId', vikram, async (request, response) => {
  const {districtId} = request.params
  const y = `DELETE FROM district
          WHERE district_id=${districtId};`
  const z = await db.run(y)
  response.send('District Removed')
})
app.put('/districts/:districtId/', vikram, async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const y = `UPDATE district
          SET district_name="${districtName}",
          state_id=${stateId},
          cases=${cases},
          cured=${cured},
          active=${active},
          deaths=${deaths}
          WHERE district_id=${districtId};
        
          `
  const z = await db.run(y)
  response.send('District Details Updated')
})
app.get('/states/:stateId/stats/', vikram, async (request, response) => {
  const {stateId} = request.params
  const f = `SELECT SUM(cases) ,SUM(cured),SUM(active) ,SUM(deaths)
           FROM district
           WHERE state_id=${stateId};`
  const k = await db.get(f)
  response.send({
    totalCases: k['SUM(cases)'],
    totalCured: k['SUM(cured)'],
    totalActive: k['SUM(active)'],
    totalDeaths: k['SUM(deaths)'],
  })
})
module.exports = app
