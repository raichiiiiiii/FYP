export const defaultSeedPassword = 'password';

const businessRoleCodes = [
  'ORG_ADMIN',
  'PROCUREMENT_OFFICER',
  'APPROVER_MANAGER',
  'FINANCE_ACCOUNTANT',
  'RECEIVING_OFFICER',
  'SUPPLIER_SALES',
  'MUDARIB_OPERATOR',
];

const financeRoleCodes = [
  'ORG_ADMIN',
  'INVESTMENT_OFFICER',
  'RISK_REVIEWER',
  'DISBURSEMENT_OFFICER',
  'FINANCIER_AUDIT_VIEWER',
];

export const localFederationNodeDefinitions = [
  businessNode({
    key: 'amanah-retail',
    legalName: 'Amanah Retail Sdn Bhd',
    type: 'BUSINESS_BUYER_SUPPLIER',
    webUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3000',
    mainFunction: 'Retail buyer and tender issuer',
  }),
  businessNode({
    key: 'barakah-supplies',
    legalName: 'Barakah Supplies Sdn Bhd',
    type: 'BUSINESS_SUPPLIER_MUDARIB',
    webUrl: 'http://localhost:5174',
    apiUrl: 'http://localhost:3001',
    mainFunction: 'Halal goods supplier and mudarib',
  }),
  businessNode({
    key: 'ihsan-foods',
    legalName: 'Ihsan Foods Manufacturing Sdn Bhd',
    type: 'BUSINESS_SUPPLIER',
    webUrl: 'http://localhost:5175',
    apiUrl: 'http://localhost:3002',
    mainFunction: 'Food manufacturer and tender bidder',
  }),
  businessNode({
    key: 'nur-logistics',
    legalName: 'Nur Logistics Sdn Bhd',
    type: 'BUSINESS_SUPPLIER',
    webUrl: 'http://localhost:5176',
    apiUrl: 'http://localhost:3003',
    mainFunction: 'Logistics supplier',
  }),
  businessNode({
    key: 'salsabil-packaging',
    legalName: 'Salsabil Packaging Sdn Bhd',
    type: 'BUSINESS_SUPPLIER',
    webUrl: 'http://localhost:5177',
    apiUrl: 'http://localhost:3004',
    mainFunction: 'Packaging supplier',
  }),
  businessNode({
    key: 'taqwa-office',
    legalName: 'Taqwa Office Systems Sdn Bhd',
    type: 'BUSINESS_BUYER_SUPPLIER',
    webUrl: 'http://localhost:5178',
    apiUrl: 'http://localhost:3005',
    mainFunction: 'Office procurement and supply business',
  }),
  businessNode({
    key: 'hikmah-health',
    legalName: 'Hikmah Health Supplies Sdn Bhd',
    type: 'BUSINESS_SUPPLIER',
    webUrl: 'http://localhost:5179',
    apiUrl: 'http://localhost:3006',
    mainFunction: 'Medical and health supplies supplier',
  }),
  financeNode({
    key: 'mabrur-finance',
    legalName: 'Mabrur Finance Partner',
    webUrl: 'http://localhost:5180',
    apiUrl: 'http://localhost:3007',
    mainFunction: 'Mudarabah finance provider',
  }),
  financeNode({
    key: 'aman-capital',
    legalName: 'Aman Capital Islamic Finance',
    webUrl: 'http://localhost:5181',
    apiUrl: 'http://localhost:3008',
    mainFunction: 'SME finance and risk review',
  }),
  financeNode({
    key: 'safwa-growth',
    legalName: 'Safwa SME Growth Fund',
    webUrl: 'http://localhost:5182',
    apiUrl: 'http://localhost:3009',
    mainFunction: 'Backup finance and co-finance review',
  }),
];

export function findLocalFederationNode(key) {
  return localFederationNodeDefinitions.find((node) => node.key === key);
}

function businessNode(input) {
  return {
    ...input,
    category: 'business',
    deploymentMode: 'standalone_sme',
    registrationNumber: registrationNumber(input.key),
    roles: businessRoleCodes,
    admin: user(input.key, 'admin', 'Organization Admin', 'ORG_ADMIN'),
    users: [
      user(
        input.key,
        'procurement',
        'Procurement Officer',
        'PROCUREMENT_OFFICER',
      ),
      user(input.key, 'approver', 'Approver Manager', 'APPROVER_MANAGER'),
      user(input.key, 'finance', 'Finance Accountant', 'FINANCE_ACCOUNTANT'),
      user(input.key, 'receiving', 'Receiving Officer', 'RECEIVING_OFFICER'),
      user(input.key, 'sales', 'Supplier Sales', 'SUPPLIER_SALES'),
      user(input.key, 'mudarib', 'Mudarib Operator', 'MUDARIB_OPERATOR'),
    ],
  };
}

function financeNode(input) {
  return {
    ...input,
    type: 'FINANCE_ENTITY',
    category: 'finance',
    deploymentMode: 'financial_entity_node',
    registrationNumber: registrationNumber(input.key),
    roles: financeRoleCodes,
    admin: user(input.key, 'admin', 'Organization Admin', 'ORG_ADMIN'),
    users: [
      user(input.key, 'investment', 'Investment Officer', 'INVESTMENT_OFFICER'),
      user(input.key, 'risk', 'Risk Reviewer', 'RISK_REVIEWER'),
      user(
        input.key,
        'disbursement',
        'Disbursement Officer',
        'DISBURSEMENT_OFFICER',
      ),
      user(input.key, 'audit', 'Finance Audit Viewer', 'FINANCIER_AUDIT_VIEWER'),
    ],
  };
}

function user(nodeKey, localPart, displayRole, roleCode) {
  return {
    email: `${localPart}@${nodeKey}.local`,
    displayName: `${displayRole} (${nodeKey})`,
    roleCode,
  };
}

function registrationNumber(key) {
  return `${key.toUpperCase().replace(/-/g, '-')}-LOCAL-NODE`;
}
