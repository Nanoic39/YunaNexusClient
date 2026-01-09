export interface UserUpdateDTO {
  nickname?: string;
  gender?: number;
  biography?: string;
  avatar?: string;
  birthday?: Date;
}

export interface UserProfile {
  uuid: string;
  username: string;
  email: string;
  nickname: string;
  gender: number;
  biography: string;
  avatar: string;
  birthday: Date;
}