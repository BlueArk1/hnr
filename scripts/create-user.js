import { createUser } from '../server/lib/users.js';

const [username, password, role] = process.argv.slice(2);

if (!username || !password) {
  console.error('Usage: npm run create-user -- <username> <password> [role]');
  process.exit(1);
}

try {
  const user = await createUser(username, password, role || 'user');
  console.log(`Created user "${user.username}" (role: ${user.role})`);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}