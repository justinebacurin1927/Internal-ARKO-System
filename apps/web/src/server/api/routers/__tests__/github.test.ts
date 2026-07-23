import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { githubRouter } from '../github'

// Preserve original env so we can restore
const OLD_ENV = { ...process.env }

const ctx = (over: any = {}) => ({
  user: { id: over.userId ?? 'u1' },
  session: { user: { id: over.userId ?? 'u1' } },
  userRole: 'USER',
  prisma: {},
} as any)

function mockFetch(status: number, body: any) {
  return jest.mocked(fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

describe('github router', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Mock global fetch
    global.fetch = jest.fn()
    // Clear env overrides
    delete process.env.GITHUB_DEFAULT_OWNER
    delete process.env.GITHUB_DEFAULT_REPO
    delete process.env.GITHUB_DEFAULT_BRANCH
  })

  afterEach(() => {
    delete (global as any).fetch
    process.env = { ...OLD_ENV }
  })

  describe('recentCommits', () => {
    it('returns parsed commits from GitHub API', async () => {
      mockFetch(200, [
        {
          sha: 'abc123',
          commit: {
            message: 'Fix bug',
            author: { name: 'Dev', date: '2026-07-23T10:00:00Z' },
          },
          html_url: 'https://github.com/owner/repo/commit/abc123',
          author: { login: 'dev', avatar_url: 'https://avatars.com/dev.png' },
        },
      ])
      const res = await githubRouter.createCaller(ctx()).recentCommits()
      expect(res.commits).toHaveLength(1)
      expect(res.commits[0].sha).toBe('abc123')
      expect(res.error).toBeNull()
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.any(Object),
      )
    })

    it('passes custom owner/repo/branch', async () => {
      mockFetch(200, [])
      await githubRouter.createCaller(ctx()).recentCommits({
        owner: 'my-org',
        repo: 'my-repo',
        branch: 'main',
        limit: 5,
      })
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('my-org/my-repo/commits?sha=main&per_page=5'),
        expect.any(Object),
      )
    })

    it('handles 403 rate limit error gracefully', async () => {
      mockFetch(403, { message: 'Rate limit exceeded' })
      const res = await githubRouter.createCaller(ctx()).recentCommits()
      expect(res.commits).toHaveLength(0)
      expect(res.error).toContain('rate limit')
    })

    it('handles 429 rate limit error gracefully', async () => {
      mockFetch(429, { message: 'Too many requests' })
      const res = await githubRouter.createCaller(ctx()).recentCommits()
      expect(res.commits).toHaveLength(0)
      expect(res.error).toContain('rate limit')
    })

    it('handles 404 repo not found gracefully', async () => {
      mockFetch(404, { message: 'Not Found' })
      const res = await githubRouter.createCaller(ctx()).recentCommits({
        owner: 'nonexistent',
        repo: 'nope',
      })
      expect(res.commits).toHaveLength(0)
      expect(res.error).toContain('not found')
    })

    it('handles other HTTP errors gracefully', async () => {
      mockFetch(500, { message: 'Server Error' })
      const res = await githubRouter.createCaller(ctx()).recentCommits()
      expect(res.commits).toHaveLength(0)
      expect(res.error).toContain('500')
    })

    it('handles malformed response body gracefully', async () => {
      mockFetch(200, { not: 'an-array' })
      const res = await githubRouter.createCaller(ctx()).recentCommits()
      expect(res.commits).toHaveLength(0)
      expect(res.error).toContain('parse')
    })

    it('handles network errors gracefully', async () => {
      jest.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'))
      const res = await githubRouter.createCaller(ctx()).recentCommits()
      expect(res.commits).toHaveLength(0)
      expect(res.error).toBe('Network failure')
    })

    it('defaults to vercel/next.js/canary when no env overrides and no input', async () => {
      mockFetch(200, [])
      await githubRouter.createCaller(ctx()).recentCommits()
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('vercel/next.js/commits?sha=canary'),
        expect.any(Object),
      )
    })

    it('filters commits to requested limit', async () => {
      const commits = Array.from({ length: 20 }, (_, i) => ({
        sha: `sha${i}`,
        commit: {
          message: `Commit ${i}`,
          author: { name: 'Dev', date: '2026-07-23T10:00:00Z' },
        },
        html_url: `https://github.com/owner/repo/commit/sha${i}`,
        author: null,
      }))
      mockFetch(200, commits)
      const res = await githubRouter.createCaller(ctx()).recentCommits({ limit: 5 })
      expect(res.commits).toHaveLength(5)
    })
  })
})
