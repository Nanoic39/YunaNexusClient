import { readdirSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'apps/web/dist')
const output = resolve(root, 'release/frontend-web.tar.xz')
if (!existsSync(resolve(dist, 'index.html'))) throw new Error('Run pnpm build first')
function filesAt(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink() || entry.name.startsWith('.'))
      throw new Error('Unexpected release entry')
    const name = prefix + entry.name
    return entry.isDirectory() ? filesAt(resolve(dir, entry.name), name + '/') : [name]
  })
}
const files = filesAt(dist).sort()
mkdirSync(dirname(output), { recursive: true })
execFileSync('tar', ['-cJf', output, '-C', dist, '--transform=s,^,web/,', '--', ...files])
console.log(output)
