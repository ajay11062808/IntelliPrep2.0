# Alternative Email Confirmation Approaches

## Option 1: Auto-Confirm Emails (Development/Testing)

If you want to skip email confirmation for development, you can configure Supabase to auto-confirm emails:

### In Supabase Dashboard:
1. Go to Authentication > Settings
2. Set "Enable email confirmations" to OFF
3. This will automatically confirm all email addresses

### Code Changes:
Update the signUp function in `constants/AuthContext.tsx`:

```typescript
const signUp = async (email: string, password: string, fullName: string) => {
  setError(null)
  setLoading(true)

  try {
    const { error, data } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        // Remove emailRedirectTo for auto-confirm
      },
    })
    
    if (data.session) {
      setSession(data.session)
      setUser(data.session.user)
      // User is automatically signed in
      router.replace("/(tabs)")
    }
    
    if (error) throw error
  } catch (error: any) {
    handleAuthError(error)
    throw error
  } finally {
    setLoading(false)
  }
}
```

## Option 2: Manual Email Confirmation Check

Add a manual confirmation check button in the app:

```typescript
const checkEmailConfirmation = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      Alert.alert("Error", "Failed to check email status")
      return
    }

    if (user?.email_confirmed_at) {
      Alert.alert("Success", "Email confirmed! You can now sign in.")
      router.replace("../(auth)/login")
    } else {
      Alert.alert("Not Confirmed", "Please check your email and click the confirmation link.")
    }
  } catch (error) {
    Alert.alert("Error", "Failed to check email status")
  }
}
```

## Option 3: Web-based Confirmation

Create a web page that handles email confirmation and redirects to the app:

1. Create a simple HTML page hosted on your domain
2. Configure Supabase to redirect to this page
3. The page can then redirect to your app using the deep link

## Recommended Approach

For production apps, use **Option 1** (the main solution) as it provides the best user experience with proper deep linking and confirmation screens.
