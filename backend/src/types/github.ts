export interface GitHubRepositoryInfo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner?: {
    login?: string;
    avatar_url?: string;
  };
}

export interface GitHubSenderInfo {
  id?: number;
  login?: string;
  avatar_url?: string;
}
