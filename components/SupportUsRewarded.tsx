import React, { useEffect, useRef, useState } from 'react'
import { Alert, Platform, Text, TouchableOpacity } from 'react-native'
import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads'

// Replace these with your real rewarded ad unit IDs before release
const ANDROID_REWARDED_UNIT_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-8052304342849455/2499914448'
const IOS_REWARDED_UNIT_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3940256099942544/1712485313'

const AD_UNIT_ID = Platform.select({ ios: IOS_REWARDED_UNIT_ID, android: ANDROID_REWARDED_UNIT_ID, default: TestIds.REWARDED }) as string

export default function SupportUsRewarded() {
  const [loaded, setLoaded] = useState(false)
  const rewardedRef = useRef<RewardedAd | null>(null)

  useEffect(() => {
    const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, { requestNonPersonalizedAdsOnly: false })
    rewardedRef.current = rewarded

    const subLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true))
    const subClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      // load a fresh ad after close
      setLoaded(false)
      const next = RewardedAd.createForAdRequest(AD_UNIT_ID)
      rewardedRef.current = next
      next.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true))
      next.load()
    })
    const subEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      Alert.alert('Thank you!', `Reward: ${reward.amount} ${reward.type || ''}`.trim())
    })

    rewarded.load()

    return () => {
      subLoaded(); subClosed(); subEarned()
      rewardedRef.current = null
    }
  }, [])

  const onPress = () => {
    const ad = rewardedRef.current
    if (!ad) {
      Alert.alert('Please try again in a moment.')
      return
    }
    if (loaded) {
      ad.show()
    } else {
      Alert.alert('Loading…', 'Ad is still loading. Please try again shortly.')
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-xl p-3 ${loaded ? 'bg-green-600' : 'bg-gray-400'}`}
      activeOpacity={0.8}
    >
      <Text className="text-white text-center font-semibold">
        {loaded ? 'Watch a Rewarded Ad (Support Us)' : 'Loading Ad…'}
      </Text>
    </TouchableOpacity>
  )
}


