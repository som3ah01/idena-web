/* eslint-disable react/prop-types */
import React, {useEffect} from 'react'
import {useMachine} from '@xstate/react'
import {
  Flex,
  Box,
  Alert,
  AlertIcon,
  Image,
  useToast,
  useDisclosure,
} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {Page, PageTitle} from '../../screens/app/components'
import {
  FlipCardTitle,
  FlipCardSubtitle,
  FlipFilter,
  FlipFilterOption,
  RequiredFlipPlaceholder,
  OptionalFlipPlaceholder,
  FlipCardList,
  EmptyFlipBox,
  FlipCard,
  DeleteFlipDrawer,
} from '../../screens/flips/components'
import {formatKeywords} from '../../screens/flips/utils'
import {IconLink} from '../../shared/components/link'
import {
  FlipType,
  IdentityStatus,
  FlipFilter as FlipFilterType,
} from '../../shared/types'
import {flipsMachine} from '../../screens/flips/machines'
import Layout from '../../shared/components/layout'
import {Notification} from '../../shared/components/notifications'
import {NotificationType} from '../../shared/providers/notification-context'
import {loadPersistentState} from '../../shared/utils/persist'
import {useAuthState} from '../../shared/providers/auth-context'
import {redact} from '../../shared/utils/logs'
import {useIdentity} from '../../shared/providers/identity-context'
import {useEpoch} from '../../shared/providers/epoch-context'

export default function FlipListPage() {
  const {t} = useTranslation()

  const toast = useToast()

  const epochState = useEpoch()
  const {privateKey} = useAuthState()

  const {
    isOpen: isOpenDeleteForm,
    onOpen: openDeleteForm,
    onClose: onCloseDeleteForm,
  } = useDisclosure()

  const [
    {
      flips: knownFlips,
      requiredFlips: requiredFlipsNumber,
      availableFlips: availableFlipsNumber,
      state: status,
    },
  ] = useIdentity()

  const [selectedFlip, setSelectedFlip] = React.useState()

  const canSubmitFlips = [
    IdentityStatus.Verified,
    IdentityStatus.Human,
    IdentityStatus.Newbie,
  ].includes(status)

  const [current, send] = useMachine(flipsMachine, {
    context: {
      knownFlips: knownFlips || [],
      filter: loadPersistentState('flipFilter') || FlipFilterType.Active,
    },
    actions: {
      onError: (_, {error}) =>
        toast({
          title: error,
          status: 'error',
          duration: 5000,
          isClosable: true,
          // eslint-disable-next-line react/display-name
          render: () => (
            <Box fontSize="md">
              <Notification title={error} type={NotificationType.Error} />
            </Box>
          ),
        }),
    },
    logger: msg => console.log(redact(msg)),
  })

  useEffect(() => {
    if (epochState && privateKey && status) {
      send('INITIALIZE', {epoch: epochState.epoch, privateKey, canSubmitFlips})
    }
  }, [canSubmitFlips, epochState, privateKey, send, status])

  const {flips, missingFlips, filter} = current.context

  const filterFlips = () => {
    switch (filter) {
      case FlipFilterType.Active:
        return flips.filter(({type}) =>
          [
            FlipType.Publishing,
            FlipType.Published,
            FlipType.Deleting,
            FlipType.Invalid,
          ].includes(type)
        )
      case FlipType.Draft:
        return flips.filter(({type}) => type === FlipType.Draft)
      case FlipType.Archived:
        return flips.filter(({type}) =>
          [FlipType.Archived, FlipType.Deleted].includes(type)
        )
      default:
        return []
    }
  }

  const madeFlipsNumber = (knownFlips || []).length

  const remainingRequiredFlips = requiredFlipsNumber - madeFlipsNumber
  const remainingOptionalFlips =
    availableFlipsNumber - Math.max(requiredFlipsNumber, madeFlipsNumber)

  return (
    <Layout>
      <Page>
        <PageTitle>{t('my_flips')}</PageTitle>
        <Flex justify="space-between" align="center" alignSelf="stretch" mb={8}>
          <FlipFilter
            value={filter}
            onChange={value => send('FILTER', {filter: value})}
          >
            <FlipFilterOption value={FlipFilterType.Active}>
              {t('active')}
            </FlipFilterOption>
            <FlipFilterOption value={FlipFilterType.Draft}>
              {t('drafts')}
            </FlipFilterOption>
            <FlipFilterOption value={FlipFilterType.Archived}>
              {t('archived')}
            </FlipFilterOption>
          </FlipFilter>
          <IconLink href="/flips/new" icon="plus-solid">
            {t('new_flip')}
          </IconLink>
        </Flex>
        {current.matches('ready.dirty.active') &&
          canSubmitFlips &&
          (remainingRequiredFlips > 0 || remainingOptionalFlips > 0) && (
            <Box alignSelf="stretch" mb={8}>
              <Alert
                status="success"
                bg="green.010"
                borderWidth="1px"
                borderColor="green.050"
                fontWeight={500}
                rounded="md"
                px={3}
                py={2}
              >
                <AlertIcon name="info" color="green.500" size={5} mr={3} />
                {remainingRequiredFlips > 0
                  ? t(`submit_requiered_flips`, {remainingRequiredFlips})
                  : null}{' '}
                {remainingOptionalFlips > 0
                  ? t(`submit_optinal_flips`, {
                      remainingOptionalFlips,
                    })
                  : null}
              </Alert>
            </Box>
          )}

        {status && !canSubmitFlips && (
          <Box alignSelf="stretch" mb={8}>
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
              {t('can_not_submit_flips_try_again')}
            </Alert>
          </Box>
        )}

        {current.matches('ready.pristine') && (
          <Flex
            flex={1}
            alignItems="center"
            justifyContent="center"
            alignSelf="stretch"
          >
            <Image src="/static/flips-cant-icn.svg" />
          </Flex>
        )}

        {current.matches('ready.dirty') && (
          <FlipCardList>
            {filterFlips().map(flip => (
              <FlipCard
                key={flip.id}
                flipService={flip.ref}
                onDelete={() => {
                  if (
                    flip.type === FlipType.Published &&
                    (knownFlips || []).includes(flip.hash)
                  ) {
                    setSelectedFlip(flip)
                    openDeleteForm()
                  } else flip.ref.send('ARCHIVE')
                }}
              />
            ))}
            {current.matches('ready.dirty.active') && (
              <>
                {missingFlips.map(({keywords}, idx) => (
                  <Box key={idx}>
                    <EmptyFlipBox>
                      <Image src="/static/flips-cant-icn.svg" />
                    </EmptyFlipBox>
                    <Box mt={4}>
                      <FlipCardTitle>
                        {keywords
                          ? formatKeywords(keywords.words)
                          : t('missing_keywords')}
                      </FlipCardTitle>
                      <FlipCardSubtitle>{t('missing_client')}</FlipCardSubtitle>
                    </Box>
                  </Box>
                ))}
                {Array.from({length: remainingRequiredFlips}, (flip, idx) => (
                  <RequiredFlipPlaceholder
                    key={idx}
                    title={`Flip #${madeFlipsNumber + idx + 1}`}
                    {...flip}
                  />
                ))}
                {Array.from({length: remainingOptionalFlips}, (flip, idx) => (
                  <OptionalFlipPlaceholder
                    key={idx}
                    title={`Flip #${madeFlipsNumber +
                      remainingRequiredFlips +
                      idx +
                      1}`}
                    {...flip}
                    isDisabled={remainingRequiredFlips > 0}
                  />
                ))}
              </>
            )}
          </FlipCardList>
        )}

        <DeleteFlipDrawer
          hash={selectedFlip?.hash}
          cover={selectedFlip?.images[selectedFlip.originalOrder[0]]}
          isOpen={isOpenDeleteForm}
          onClose={onCloseDeleteForm}
          onDelete={() => {
            selectedFlip.ref.send('DELETE')
            onCloseDeleteForm()
          }}
        />
      </Page>
    </Layout>
  )
}
