import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Alert, AlertIcon, FormControl, Stack} from '@chakra-ui/core'
import {Box, Label, Button, Link} from '../../shared/components'
import theme, {rem} from '../../shared/theme'
import Flex from '../../shared/components/flex'
import SettingsLayout from './layout'
import {
  useSettingsState,
  useSettingsDispatch,
  apiKeyStates,
} from '../../shared/providers/settings-context'
import {useNotificationDispatch} from '../../shared/providers/notification-context'
import {
  FormLabel,
  Input,
  PasswordInput,
} from '../../shared/components/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {checkKey, fetchEpoch, getKeyById, getProvider} from '../../shared/api'

const BASIC_ERROR = () => {
  const {t} = useTranslation()
  return t('node_is_unavailable')
}

function Settings() {
  const {t} = useTranslation()
  const {addNotification, addError} = useNotificationDispatch()
  const settingsState = useSettingsState()
  const {saveConnection, addPurchasedKey} = useSettingsDispatch()

  const [state, setState] = useState({
    url: settingsState.url || '',
    apiKey: settingsState.apiKey || '',
  })

  const [offlineError, setOfflineError] = useState(BASIC_ERROR)

  useEffect(() => {
    setState({url: settingsState.url, apiKey: settingsState.apiKey})
  }, [settingsState])

  const notify = () =>
    addNotification({
      title: t('settings_updated'),
      body: `${t('Connected_to_url')} ${state.url}`,
    })

  const restorePurchase = async () => {
    try {
      const result = await getKeyById(settingsState.apiKeyId)
      const provider = await getProvider(settingsState.apiKeyData.provider)
      addPurchasedKey(provider.data.url, result.key, result.epoch)
    } catch {
      addError({title: t('restore_faild')})
    }
  }

  const errorNodeOwner = t('node_unavailable_contact_owner')
  useEffect(() => {
    async function check() {
      try {
        const {epoch} = await fetchEpoch(true)
        const result = await checkKey(settingsState.apiKey)
        if (result.epoch >= epoch - 1) {
          const provider = await getProvider(result.provider)
          setOfflineError(` ${errorNodeOwner} ${provider.data.ownerName}`)
        }
      } catch (e) {
        setOfflineError(BASIC_ERROR)
      }
    }

    if (settingsState.apiKeyState === apiKeyStates.OFFLINE) check()
    else setOfflineError(BASIC_ERROR)
  }, [settingsState.apiKeyState, settingsState.url, settingsState.apiKey])

  return (
    <SettingsLayout>
      <Stack spacing={5} mt={rem(20)} width={rem(480)}>
        {settingsState.apiKeyState === apiKeyStates.EXPIRED && (
          <Alert
            status="error"
            bg="red.010"
            borderWidth="1px"
            borderColor="red.050"
            fontWeight={500}
            rounded="md"
            px={3}
            py={2}
          >
            <AlertIcon name="info" color="red.500" size={5} mr={3}></AlertIcon>
            {t('api_key_expired')}
          </Alert>
        )}
        {settingsState.apiKeyState === apiKeyStates.OFFLINE &&
          !!settingsState.url &&
          !!settingsState.apiKey && (
            <Alert
              status="error"
              bg="red.010"
              borderWidth="1px"
              borderColor="red.050"
              fontWeight={500}
              rounded="md"
              px={3}
              py={2}
            >
              <AlertIcon
                name="info"
                color="red.500"
                size={5}
                mr={3}
              ></AlertIcon>
              {t(offlineError, {nsSeparator: 'null'})}
            </Alert>
          )}
        <FormControl>
          <Flex justify="space-between">
            <FormLabel color="brandGray.500" mb={2}>
              {t('node_address')}
            </FormLabel>
            <Flex>
              <Link
                href="/node/rent"
                color={theme.colors.primary}
                fontSize={rem(13)}
                style={{fontWeight: 500}}
              >
                {t('rent_new_node')} {'>'}
              </Link>
            </Flex>
          </Flex>
          <Input
            id="url"
            value={state.url}
            onChange={e => setState({...state, url: e.target.value})}
          />
        </FormControl>
        <FormControl>
          <FormLabel color="brandGray.500" mb={2}>
            {t('node_API_key')}
          </FormLabel>
          <PasswordInput
            id="key"
            value={state.apiKey}
            onChange={e => setState({...state, apiKey: e.target.value})}
          ></PasswordInput>
        </FormControl>

        <Flex justify="space-between">
          {settingsState.apiKeyId && (
            <SecondaryButton onClick={restorePurchase}>
              {t('Restore purchase')}
            </SecondaryButton>
          )}
          <PrimaryButton
            onClick={() => {
              saveConnection(state.url, state.apiKey)
              notify()
            }}
            ml="auto"
          >
            {t('save')}
          </PrimaryButton>
        </Flex>
      </Stack>
    </SettingsLayout>
  )
}

export default Settings
