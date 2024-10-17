export const AdminServicePort = "AdminServicePort";

// TODO: finish defining the AdminServicePort interface
export interface AdminServicePort {
  intakeCards(): Promise<void>; // TODO: Define return type ?
  intakeSets(): Promise<void>; // TODO: Define return type ?
}
