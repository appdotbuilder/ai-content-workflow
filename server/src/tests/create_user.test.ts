import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User'
};

const secondTestInput: CreateUserInput = {
  email: 'another@example.com',
  name: 'Another User'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Validate returned user object
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Verify user exists in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser(secondTestInput);

    // Verify both users exist and have different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('another@example.com');

    // Verify both users are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email should fail
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      name: 'Different Name'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should handle email with different formats correctly', async () => {
    const emailVariations = [
      { email: 'user+tag@example.com', name: 'User With Plus' },
      { email: 'user.name@example.co.uk', name: 'User With Dots' },
      { email: 'UPPERCASE@EXAMPLE.COM', name: 'Uppercase User' }
    ];

    for (const input of emailVariations) {
      const result = await createUser(input);
      expect(result.email).toEqual(input.email);
      expect(result.name).toEqual(input.name);
    }

    // Verify all users were created
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(emailVariations.length);
  });

  it('should auto-generate timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    // Timestamps should be within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());

    // Both timestamps should be very close to each other on creation
    const timeDifference = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDifference).toBeLessThan(1000); // Less than 1 second difference
  });
});