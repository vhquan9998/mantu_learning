import { AUTH } from '@/apis';
import { KEYS } from '@/constants';
import { AxiosError } from 'axios';
import { defineStore } from 'pinia';
import { useQuasar } from 'quasar';
import { reactive, toRefs } from 'vue';
import { useQuery, useMutation } from 'vue-query';

export interface State {
  isAuth: boolean;
  user: null | {
    id: number;
    name: string;
  };
  token?: string;
}

const initialState = { isAuth: false, user: null };

export const useAuthStore = defineStore('auth', () => {
  const $q = useQuasar();
  const state = reactive<State>(initialState);

  const { isLoading, refetch } = useQuery(
    ['GET_USER_WITH_TOKEN', state.token],
    (q) => AUTH.getUser(q.queryKey[1]),
    {
      enabled: Boolean(state.token),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      onSuccess: (d) => {
        state.user = d.data;
        state.isAuth = Boolean(d.data);
      },
      onError: (err: AxiosError) => {
        if (err.response?.status === 401) {
          refreshState();
        }
      },
      retry: false
    }
  );

  const { mutate, isLoading: isAuthenticating } = useMutation(
    ['POST_USER_WITH_TOKEN'],
    AUTH.login,
    {
      onSuccess: (d) => {
        localStorage.setItem(KEYS.APP_TOKEN, d.accessToken);
        state.isAuth = true;
        state.token = d.accessToken;
        state.user = d.data;
      }
    }
  );

  function bootstrap() {
    const storedData = localStorage.getItem(KEYS.APP_TOKEN);
    if (!storedData) return;
    state.token = storedData;
    refetch.value();
  }

  function refreshState() {
    state.isAuth = false;
    state.user = null;
    state.token = undefined;
    localStorage.clear();
  }

  function logout() {
    $q.dialog({
      title: 'Alert',
      message: 'Are you sure to logout?',
      ok: {
        color: 'primary'
      },
      cancel: true
    }).onOk(refreshState);
  }

  function login(payload: API.LoginPayload) {
    mutate(payload);
  }

  return {
    ...toRefs(state),
    isLoading,
    isAuthenticating,
    bootstrap,
    logout,
    login
  };
});
