const employeeModel = require('../models/employeeModel');
const { getEmployeeImagePath, normalizeEmployeeImagePath } = require('../utils/employeeUpload');
const { invalidateCache, getOrSetCache } = require('../utils/cache');

class EmployeeService {
  async getAllEmployees() {
    return getOrSetCache('employees:all', 10, async () => {
      try {
        return await employeeModel.getAll();
      } catch (error) {
        throw new Error(`Failed to fetch employees: ${error.message}`);
      }
    });
  }

  async getEmployeeById(id) {
    try {
      const employee = await employeeModel.getById(id);
      if (!employee) {
        throw new Error('Employee not found');
      }
      return employee;
    } catch (error) {
      throw error;
    }
  }

  async createEmployee(data, files, baseUrl) {
    try {
      this.validateEmployeeData(data);

      // Handle image uploads
      if (typeof data.page_access === 'string') {
        try {
          data.page_access = JSON.parse(data.page_access);
        } catch (error) {
          console.error('Error parsing page_access:', error);
        }
      }

      if (files) {
        if (files.profile_img && files.profile_img[0]) {
          data.profile_img = getEmployeeImagePath(files.profile_img[0].filename);
        }
        if (files.document_img && files.document_img.length > 0) {
          const documentUrls = files.document_img
            .map(file => getEmployeeImagePath(file.filename))
            .filter(Boolean);
          data.document_img = JSON.stringify(documentUrls);
        }
      }

      const result = await employeeModel.create(data);
      // Invalidate Caches
      await Promise.all([
        invalidateCache('dashboard:admin:global'),
        invalidateCache('employees:*')
      ]);
      return result;
    } catch (error) {
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  async updateEmployee(id, data, files, baseUrl) {
    try {
      const existingEmployee = await employeeModel.getById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }
      if (typeof data.page_access === 'string') {
        try {
          data.page_access = JSON.parse(data.page_access);
        } catch (error) {
          console.error('Error parsing page_access:', error);
        }
      }

      const payload = {
        ...existingEmployee,
        ...data
      };
      payload.profile_img = normalizeEmployeeImagePath(payload.profile_img);

      if (files?.profile_img?.[0]) {
        payload.profile_img = getEmployeeImagePath(files.profile_img[0].filename);
      }

      // Handle document updates (selective removal + new uploads)
      let currentDocuments = [];
      let docChanged = false;

      // 1. Get existing documents if provided by frontend
      if (data.existing_documents !== undefined) {
        docChanged = true;
        try {
          currentDocuments = typeof data.existing_documents === 'string'
            ? JSON.parse(data.existing_documents)
            : data.existing_documents;
          currentDocuments = (Array.isArray(currentDocuments) ? currentDocuments : [currentDocuments])
            .map(normalizeEmployeeImagePath)
            .filter(Boolean);
        } catch (error) {
          console.error('Error parsing existing_documents:', error);
          // Fallback to existing ones if parse fails
          currentDocuments = Array.isArray(existingEmployee.document_img) ? existingEmployee.document_img : [];
        }
      } else {
        // If not provided, assume we keep what's there unless new files are coming
        currentDocuments = Array.isArray(existingEmployee.document_img) ? existingEmployee.document_img : [];
      }

      // 2. Add newly uploaded files
      if (files?.document_img && files.document_img.length > 0) {
        docChanged = true;
        const documentUrls = files.document_img
          .map(file => getEmployeeImagePath(file.filename))
          .filter(Boolean);
        currentDocuments = [...currentDocuments, ...documentUrls];
      }

      // 3. Update payload if any changes occurred
      if (docChanged) {
        payload.document_img = JSON.stringify(currentDocuments);
      }

      const result = await employeeModel.update(id, payload);
      // Invalidate Caches
      await Promise.all([
        invalidateCache('dashboard:admin:global'),
        invalidateCache(`dashboard:details:${existingEmployee.employee_id}`),
        invalidateCache(`dashboard:user:${existingEmployee.employee_id}:*`),
        invalidateCache('employees:*')
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteEmployee(id) {
    try {
      const existingEmployee = await employeeModel.getById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }
      const result = await employeeModel.remove(id);
      // Invalidate Caches
      await Promise.all([
        invalidateCache('dashboard:admin:global'),
        invalidateCache(`dashboard:details:${existingEmployee.employee_id}`),
        invalidateCache(`dashboard:user:${existingEmployee.employee_id}:*`),
        invalidateCache('employees:*')
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getDistinctDepartments() {
    return getOrSetCache('employees:departments', 3600, async () => {
      try {
        return await employeeModel.getDistinctDepartments();
      } catch (error) {
        throw new Error(`Failed to fetch departments: ${error.message}`);
      }
    });
  }

  async getDistinctDesignations() {
    return getOrSetCache('employees:designations', 3600, async () => {
      try {
        return await employeeModel.getDistinctDesignations();
      } catch (error) {
        throw new Error(`Failed to fetch designations: ${error.message}`);
      }
    });
  }

  validateEmployeeData(data) {
    const requiredFields = [
      'employee_id',
      'password'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Email validation (only when provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email_id && !emailRegex.test(data.email_id)) {
      throw new Error('Invalid email format');
    }
  }
}

module.exports = new EmployeeService();
