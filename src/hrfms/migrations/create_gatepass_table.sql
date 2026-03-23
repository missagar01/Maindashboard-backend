CREATE TABLE IF NOT EXISTS gatepass (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  department VARCHAR(150) NOT NULL,
  employee_address TEXT,
  purpose_of_visit TEXT,
  reason TEXT,
  date_of_leave DATE NOT NULL,
  time_of_entry TIME NOT NULL,
  hod_approval BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  gate_pass_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
