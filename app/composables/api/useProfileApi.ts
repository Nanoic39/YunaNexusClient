export const useProfileApi = () => {
  const uploadAvatar = async (file: Blob) => {
    const url = URL.createObjectURL(file);
    return Promise.resolve({
      code: 200,
      msg: "OK",
      tips: "",
      data: { avatarUrl: url },
    });
  };
  return { uploadAvatar };
};
