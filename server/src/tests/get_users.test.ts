import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'User One'
        },
        {
          email: 'user2@example.com', 
          name: 'User Two'
        },
        {
          email: 'user3@example.com',
          name: 'User Three'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify user data
    expect(result[0].email).toEqual('user1@example.com');
    expect(result[0].name).toEqual('User One');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].email).toEqual('user2@example.com');
    expect(result[1].name).toEqual('User Two');
    
    expect(result[2].email).toEqual('user3@example.com');
    expect(result[2].name).toEqual('User Three');
  });

  it('should return users ordered by creation', async () => {
    // Create users at different times to test ordering
    await db.insert(usersTable)
      .values({
        email: 'first@example.com',
        name: 'First User'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(usersTable)
      .values({
        email: 'second@example.com',
        name: 'Second User'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
    expect(result[0].email).toEqual('first@example.com');
    expect(result[1].email).toEqual('second@example.com');
  });

  it('should include all user fields', async () => {
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    // Verify all required fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.email).toEqual('test@example.com');
    expect(user.name).toEqual('Test User');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});