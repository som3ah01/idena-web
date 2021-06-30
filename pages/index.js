import React, {useEffect} from 'react'
import {Box, Icon, Stack, useDisclosure, useToast} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import {Page, PageTitle} from '../screens/app/components'
import {
  UserInlineCard,
  SimpleUserStat,
  UserStatList,
  UserStat,
  UserStatLabel,
  UserStatValue,
  AnnotatedUserStat,
  ActivateInviteForm,
  ValidationResultToast,
  ActivateMiningForm,
  KillForm,
} from '../screens/profile/components'
import Layout from '../shared/components/layout'
import {IdentityStatus} from '../shared/types'
import {
  toPercent,
  toLocaleDna,
  mapIdentityToFriendlyStatus,
} from '../shared/utils/utils'
import {hasPersistedValidationResults} from '../screens/validation/utils'
import {IconLink} from '../shared/components/link'
import {useIdentity} from '../shared/providers/identity-context'
import {useEpoch} from '../shared/providers/epoch-context'
import {fetchBalance} from '../shared/api/wallet'
import {useAuthState} from '../shared/providers/auth-context'
import {IconButton2} from '../shared/components/button'
import {validDnaUrl} from '../shared/utils/dna-link'
import {DnaSignInDialog} from '../screens/dna/containers'
import {Toast} from '../shared/components/components'

export default function ProfilePage() {
  const queryClient = useQueryClient()

  const {
    t,
    i18n: {language},
  } = useTranslation()

  const [
    {
      address,
      state,
      penalty,
      age,
      totalShortFlipPoints,
      totalQualifiedFlips,
      online,
      delegatee,
      delegationEpoch,
      canMine,
    },
  ] = useIdentity()

  const epoch = useEpoch()
  const {coinbase, privateKey} = useAuthState()

  const [showValidationResults, setShowValidationResults] = React.useState()

  const {
    isOpen: isOpenKillForm,
    onOpen: onOpenKillForm,
    onClose: onCloseKillForm,
  } = useDisclosure()

  const {
    data: {balance, stake},
  } = useQuery(['get-balance', address], () => fetchBalance(address), {
    initialData: {balance: 0, stake: 0},
    enabled: !!address,
    refetchInterval: 30 * 1000,
  })

  useEffect(() => {
    if (epoch) {
      const {epoch: epochNumber} = epoch
      if (epochNumber) {
        queryClient.invalidateQueries('get-balance')
        setShowValidationResults(hasPersistedValidationResults(epochNumber))
      }
    }
  }, [epoch, queryClient])

  const {
    isOpen: isOpenDnaSignInDialog,
    onOpen: onOpenDnaSignInDialog,
    onClose: onCloseDnaSignInDialog,
  } = useDisclosure()

  const [dnaUrl, setDnaUrl] = React.useState(() =>
    typeof window !== 'undefined'
      ? JSON.parse(sessionStorage.getItem('dnaUrl'))
      : null
  )

  React.useEffect(() => {
    if (dnaUrl && validDnaUrl(dnaUrl.route)) {
      onOpenDnaSignInDialog()
    } else {
      sessionStorage.removeItem('dnaUrl')
      onCloseDnaSignInDialog()
    }
  }, [dnaUrl, onCloseDnaSignInDialog, onOpenDnaSignInDialog])

  const toast = useToast()

  const toDna = toLocaleDna(language)

  return (
    <Layout canRedirect={!dnaUrl}>
      <Page>
        <PageTitle mb={8}>{t('profile')}</PageTitle>
        <Stack isInline spacing={10}>
          <Stack spacing={6}>
            <UserInlineCard address={coinbase} state={state} />
            <UserStatList>
              <SimpleUserStat label={t('address')} value={coinbase} />
              {state === IdentityStatus.Newbie ? (
                <AnnotatedUserStat
                  annotation={t('solve_more_filps')}
                  label={t('status')}
                  value={mapIdentityToFriendlyStatus(state)}
                />
              ) : (
                <SimpleUserStat
                  label={t('status')}
                  value={mapIdentityToFriendlyStatus(state)}
                />
              )}
              <UserStat>
                <UserStatLabel>{t('balance')}</UserStatLabel>
                <UserStatValue>{toDna(balance)}</UserStatValue>
              </UserStat>
              {stake > 0 && state === IdentityStatus.Newbie && (
                <Stack spacing={4}>
                  <AnnotatedUserStat
                    annotation={t('you_need_verified_status_terminate')}
                    label={t('stake')}
                    value={toDna(stake * 0.25)}
                  />
                  <AnnotatedUserStat
                    annotation={t('you_need_verified_status_locked')}
                    label={t('locked')}
                    value={toDna(stake * 0.75)}
                  />
                </Stack>
              )}

              {stake > 0 && state !== IdentityStatus.Newbie && (
                <AnnotatedUserStat
                  annotation={t('in_oder_withdraw_stake')}
                  label={t('stake')}
                  value={toDna(stake)}
                />
              )}

              {penalty > 0 && (
                <AnnotatedUserStat
                  annotation={t('your_node_offline_more_than_hour')}
                  label={t('mining_penalty')}
                  value={toDna(penalty)}
                />
              )}

              {age > 0 && <SimpleUserStat label={t('age')} value={age} />}

              {epoch && (
                <SimpleUserStat
                  label={t('next_validation')}
                  value={new Date(epoch.nextValidation).toLocaleString()}
                />
              )}

              {totalQualifiedFlips > 0 && (
                <AnnotatedUserStat
                  annotation={t('total_score_validations')}
                  label={t('total_score')}
                >
                  <UserStatValue>
                    {totalShortFlipPoints} out of {totalQualifiedFlips} (
                    {toPercent(totalShortFlipPoints / totalQualifiedFlips)})
                  </UserStatValue>
                </AnnotatedUserStat>
              )}
            </UserStatList>
            <ActivateInviteForm />
          </Stack>
          <Stack spacing={10} w={48}>
            <Box mt={2} minH={62}>
              {address && privateKey && canMine && (
                <ActivateMiningForm
                  privateKey={privateKey}
                  isOnline={online}
                  delegatee={delegatee}
                  delegationEpoch={delegationEpoch}
                />
              )}
            </Box>
            <Stack spacing={1} align="flex-start">
              <IconLink href="/flips/new" icon={<Icon name="photo" size={5} />}>
                {t('new_flip')}
              </IconLink>
              <IconButton2
                isDisabled={!true}
                icon="delete"
                onClick={onOpenKillForm}
              >
                {t('terminate')}
              </IconButton2>
            </Stack>
          </Stack>
        </Stack>
        <KillForm isOpen={isOpenKillForm} onClose={onCloseKillForm}></KillForm>

        {showValidationResults && <ValidationResultToast epoch={epoch.epoch} />}

        {dnaUrl && (
          <DnaSignInDialog
            isOpen={isOpenDnaSignInDialog}
            query={dnaUrl?.query}
            onDone={() => setDnaUrl('')}
            onError={error =>
              toast({
                status: 'error',
                // eslint-disable-next-line react/display-name
                render: () => <Toast status="error" title={error} />,
              })
            }
            onClose={onCloseDnaSignInDialog}
          />
        )}
      </Page>
    </Layout>
  )
}
