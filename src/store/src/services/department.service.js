import { withPgClient } from "../config/postgres.js";
import { getOrSetCache, deleteCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";

async function invalidateDepartmentCaches(departmentName = null) {
  const deletes = [
    deleteCache(cacheKeys.departments()),
    deleteCache(cacheKeys.departmentHodPattern()),
  ];

  if (departmentName) {
    deletes.push(deleteCache(cacheKeys.departmentHod(departmentName)));
  }

  await Promise.all(deletes);
}

/**
 * Fetches HOD details from 'departments' table by department name.
 */
export async function getHODByDepartment(departmentName) {
  if (!departmentName) return null;

  const normalizedDepartment = departmentName.trim();

  return getOrSetCache(
    cacheKeys.departmentHod(normalizedDepartment),
    () =>
      withPgClient(async (client) => {
        const { rows } = await client.query(
          `
          SELECT id, department, hod, mobile_number
          FROM departments
          WHERE UPPER(department) = UPPER($1)
          LIMIT 1
          `,
          [normalizedDepartment]
        );

        return rows[0] || null;
      }),
    DEFAULT_TTL.DEPARTMENTS
  );
}

/**
 * Fetches all departments.
 */
export async function getAllDepartments() {
  return getOrSetCache(
    cacheKeys.departments(),
    () =>
      withPgClient(async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM departments ORDER BY department ASC`
        );
        return rows;
      }),
    DEFAULT_TTL.DEPARTMENTS
  );
}

/**
 * Creates a new department.
 */
export async function createDepartment(data) {
  const { department, hod, mobile_number } = data;
  const created = await withPgClient(async (client) => {
    const { rows } = await client.query(
      `
      INSERT INTO departments (department, hod, mobile_number)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [department, hod, mobile_number]
    );
    return rows[0];
  });

  await invalidateDepartmentCaches(department);
  return created;
}

/**
 * Updates an existing department.
 */
export async function updateDepartment(id, data) {
  const { department, hod, mobile_number } = data;
  const updated = await withPgClient(async (client) => {
    const { rows } = await client.query(
      `
      UPDATE departments
      SET department = $1, hod = $2, mobile_number = $3
      WHERE id = $4
      RETURNING *
      `,
      [department, hod, mobile_number, id]
    );
    return rows[0];
  });

  if (updated) {
    await invalidateDepartmentCaches(updated.department || department);
  }

  return updated;
}

/**
 * Deletes a department.
 */
export async function deleteDepartment(id) {
  return withPgClient(async (client) => {
    const { rows } = await client.query(
      `DELETE FROM departments WHERE id = $1 RETURNING department`,
      [id]
    );

    await invalidateDepartmentCaches(rows[0]?.department || null);
    return { success: true };
  });
}
