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
  userInfo: UserInfoVO;
}


