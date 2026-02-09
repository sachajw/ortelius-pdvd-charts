const axios = require('axios')
const yaml = require('js-yaml')
const fs = require('fs')
require('process')

const chartRepos = [
  'ortelius/pdvd-arangodb',
  'ortelius/pdvd-backend',
  'ortelius/pdvd-frontend',
  'ortelius/pdvd-osvdev-job',  
  'ortelius/pdvd-relscanner-job' 
]

// Helper functions
async function getChartEntries () {
  let sha = ''

  await axios.get('https://api.github.com/repos/ortelius/pdvd-charts/commits/main').then(response => {
    sha = response.data.sha
  })

  const url = 'https://raw.githubusercontent.com/ortelius/pdvd-charts/' + sha + '/charts/pdvd/Chart.yaml'
  let parts = []
  let latest = ''
  let ver = ''

  await axios.get(url).then(response => {
    const parsedYaml = yaml.load(response.data)
    chartVersion = parsedYaml.version
    parts = chartVersion.split('.')
    ver = parseInt(parts[2]) + 1
    parts[2] = ver.toString()
    chartVersion = parts.join('.')
  })

  const latestChart = []

  for (let i = 0; i < chartRepos.length; i++) {
    await axios.get('https://api.github.com/repos/' + chartRepos[i] + '/commits/gh-pages').then(response => {
      sha = response.data.sha
    })

    const repoUrl = 'https://raw.githubusercontent.com/' + chartRepos[i] + '/' + sha + '/index.yaml'

    await axios.get(repoUrl).then(response => {
      const parsedYaml = yaml.load(response.data)
      const entries = parsedYaml.entries

      Object.keys(entries).forEach(key => {
        latest = null

        Object.entries(entries[key]).forEach(entry => {
          if (latest == null) { latest = entry } else if (latest.created < entry.created) { latest = entry }
        })
        latest = latest[1]

        const dep = {}
        dep.name = latest.name
        dep.version = latest.version
        dep.repository = 'https://ortelius.github.io/' + key + '/'
        latestChart.push(dep)
      })
    })
  }
  chartEntries = latestChart
  return latestChart
}

function createYamlOutput () {
  const output = yaml.dump({
    apiVersion: 'v2',
    name: 'pdvd',
    description: 'Post-Deployment Vulnerability Detection and AI Remediation',
    home: 'https://ortelius.io',
    icon: 'https://ortelius.github.io/pdvd-charts/ortelius.svg',
    keywords: ['Vulnerability', 'Remediation', 'AI', 'SBOM'],
    type: 'application',
    version: chartVersion,
    appVersion: '12.0.0',
    dependencies: chartEntries
  }, { noArrayIndent: true })

  fs.readFile('./charts/pdvd/README.md', 'utf8', function (err, data) {
    if (err) {
      return console.log(err)
    }
    const result = data.replace(/DEPLOYHUB_VERSION=\d+\.\d+\.\d+/g, 'DEPLOYHUB_VERSION=' + chartVersion)

    fs.writeFile('./charts/pdvd/README.md', result, 'utf8', function (err) {
      if (err) return console.log(err)
    })
  })

  return output
}
// -----------------

let chartEntries = []
let chartVersion = ''

getChartEntries().then(() => {
  const yamlOutput = createYamlOutput()
  console.log(yamlOutput)
  fs.writeFileSync('./charts/pdvd/Chart.yaml', yamlOutput, 'utf8', (err) => {
    console.log(err)
  })
})
