export interface RoleVO {
  id: number;
  roleCode: string;
  roleName: string;
  roleLevel: number;
  description: string;
  createdAt: string;
}

export interface UserInfoVO {
  nickname: string;
  avatar: string | null;
  gender: string;
  biography: string | null;
  experience: number;
}

export interface UserLoginVO {
  uuid: string;
  username: string;
  email: string;
  token: string;
  refreshToken: string;
  roles: RoleVO[];
  userInfo: UserInfoVO;
}


