import '../../styles/globals.css'
import '../../styles/quill.snow.css'

import type { AppProps } from 'next/app'

import Layout from '../components/layout/Layout'

import { InterfaceProvider } from '../context/InterfaceContext'
import { MouseProvider } from '../context/MouseContext'
import { ModalProvider } from '../context/ModalContext'
import { InfoProvider } from '../context/InfoContext'
import { DropdownProvider } from '../context/DropdownContext'
import { AttachmentViewerProvider } from '../context/AttachmentViewerContext'
import { FooterProvider } from '../context/FooterContext'
import AuthProvider from '../context/AuthContext'
import PusherProvider from '../context/PusherContext'
import { UsersProvider } from '../context/UsersContext'
import ChatProvider from '../context/ChatContext'
import UserDropdownProvider from '../context/UserDropdownContext'
import { AuthGuard } from '../../utils/PageGuard'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MouseProvider>
      <InterfaceProvider>
        <PusherProvider>
          <AuthProvider>
            <UsersProvider>
              <UserDropdownProvider>
                <DropdownProvider>
                  <InfoProvider>
                    <ModalProvider>
                      <AttachmentViewerProvider>
                        <ChatProvider>
                          <FooterProvider>
                            <Layout>
                              {
                                //@ts-expect-error
                                Component.requiresAuth ? (
                                  <AuthGuard>
                                    <Component {...pageProps} />
                                  </AuthGuard>
                                ) : (
                                  <Component {...pageProps} />
                                )
                              }
                            </Layout>
                          </FooterProvider>
                        </ChatProvider>
                      </AttachmentViewerProvider>
                    </ModalProvider>
                  </InfoProvider>
                </DropdownProvider>
              </UserDropdownProvider>
            </UsersProvider>
          </AuthProvider>
        </PusherProvider>
      </InterfaceProvider>
    </MouseProvider >
  )
}

export default MyApp
