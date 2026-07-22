const isProduction = process.env.VERCEL_ENV === 'production'

if (!isProduction) {
  process.exit(0)
}

const expectedSource = {
  provider: 'github',
  owner: 'yanghaoleng',
  repository: 'Mikey-index',
  branch: 'master',
}

const actualSource = {
  provider: process.env.VERCEL_GIT_PROVIDER || '',
  owner: process.env.VERCEL_GIT_REPO_OWNER || '',
  repository: process.env.VERCEL_GIT_REPO_SLUG || '',
  branch: process.env.VERCEL_GIT_COMMIT_REF || '',
  commit: process.env.VERCEL_GIT_COMMIT_SHA || '',
}

const isCanonicalSource =
  actualSource.provider === expectedSource.provider &&
  actualSource.owner === expectedSource.owner &&
  actualSource.repository === expectedSource.repository &&
  actualSource.branch === expectedSource.branch &&
  actualSource.commit.length > 0

if (!isCanonicalSource) {
  console.error('Blocked non-canonical production deployment.', {
    expected: expectedSource,
    actual: actualSource,
  })
  process.exit(1)
}

console.log(
  `production source verified: ${actualSource.owner}/${actualSource.repository}@${actualSource.branch} (${actualSource.commit.slice(0, 7)})`,
)
