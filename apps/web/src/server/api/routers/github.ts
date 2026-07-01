import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

/**
 * GitHub commit shape returned by the API.
 */
const CommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    message: z.string(),
    author: z.object({
      name: z.string(),
      date: z.string(),
    }),
  }),
  html_url: z.string(),
  author: z
    .object({
      login: z.string(),
      avatar_url: z.string(),
    })
    .nullable(),
})

/**
 * Default repo shown on the dashboard (override via env or input).
 */
const DEFAULT_OWNER = process.env.GITHUB_DEFAULT_OWNER ?? 'vercel'
const DEFAULT_REPO = process.env.GITHUB_DEFAULT_REPO ?? 'next.js'
const DEFAULT_BRANCH = process.env.GITHUB_DEFAULT_BRANCH ?? 'canary'

export const githubRouter = router({
  /**
   * Fetch recent commits from a public GitHub repository.
   * Defaults can be overridden via input or env vars:
   *   GITHUB_DEFAULT_OWNER, GITHUB_DEFAULT_REPO, GITHUB_DEFAULT_BRANCH
   */
  recentCommits: protectedProcedure
    .input(
      z
        .object({
          owner: z.string().optional(),
          repo: z.string().optional(),
          branch: z.string().optional(),
          limit: z.number().min(1).max(30).default(10),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const owner = input?.owner ?? DEFAULT_OWNER
      const repo = input?.repo ?? DEFAULT_REPO
      const branch = input?.branch ?? DEFAULT_BRANCH
      const limit = input?.limit ?? 10

      try {
        const res = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'arko-dashboard',
            },
            // Cache for 60s in the fetch layer
            cache: 'force-cache',
            next: { revalidate: 60 },
          },
        )

        if (!res.ok) {
          // If 403/rate-limited, return a friendly message
          if (res.status === 403 || res.status === 429) {
            return {
              commits: [] as z.infer<typeof CommitSchema>[],
              error: 'GitHub API rate limit reached. Try again later.',
            }
          }
          if (res.status === 404) {
            return {
              commits: [] as z.infer<typeof CommitSchema>[],
              error: `Repository "${owner}/${repo}" not found.`,
            }
          }
          return {
            commits: [] as z.infer<typeof CommitSchema>[],
            error: `GitHub API error: ${res.status}`,
          }
        }

        const data = await res.json()
        const parsed = z.array(CommitSchema).safeParse(data)

        if (!parsed.success) {
          return {
            commits: [] as z.infer<typeof CommitSchema>[],
            error: 'Failed to parse GitHub response.',
          }
        }

        return { commits: parsed.data.slice(0, limit), error: null as string | null }
      } catch (err) {
        return {
          commits: [] as z.infer<typeof CommitSchema>[],
          error: err instanceof Error ? err.message : 'Failed to fetch GitHub commits',
        }
      }
    }),
})
