import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { colors } from "@/utils/theme";
import {
  getMessages,
  markMessageAsRead,
} from "@/services/messageService";

// Local design values so this screen does not depend
// on extra theme exports.
const PURPLE = "#25145F";
const WHITE = "#FFFFFF";
const LINE = "#E9E8F0";
const PALE_PURPLE = "#F3F0FF";

type Message = {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
};

const getMessageMeta = (title: string) => {
  const normalized = title.toLowerCase();

  if (
    normalized.includes("security") ||
    normalized.includes("frozen") ||
    normalized.includes("suspicious")
  ) {
    return {
      icon: "shield-checkmark-outline" as const,
      bg: "#FFF4E8",
      color: "#A85B00",
    };
  }

  if (
    normalized.includes("successful") ||
    normalized.includes("deposited")
  ) {
    return {
      icon: "checkmark-circle-outline" as const,
      bg: "#EAF7F0",
      color: "#168452",
    };
  }

  if (
    normalized.includes("payment") ||
    normalized.includes("fee")
  ) {
    return {
      icon: "receipt-outline" as const,
      bg: "#F5F2FF",
      color: PURPLE,
    };
  }

  if (
    normalized.includes("cashback") ||
    normalized.includes("feature")
  ) {
    return {
      icon: "sparkles-outline" as const,
      bg: "#F3F0FF",
      color: PURPLE,
    };
  }

  return {
    icon: "mail-outline" as const,
    bg: PALE_PURPLE,
    color: PURPLE,
  };
};

export default function Messages() {
  const router = useRouter();

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [selectedMessage, setSelectedMessage] =
    useState<Message | null>(null);

  const [modalVisible, setModalVisible] =
    useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const apiMessages = await getMessages();
      if (apiMessages && Array.isArray(apiMessages)) {
        setMessages(
          apiMessages.map((m) => ({
            id: m.id,
            title: m.title,
            body: m.body,
            timestamp: new Date(m.createdAt),
            read: m.isRead,
          }))
        );
      } else {
        setMessages([]);
      }
    } catch {
      // Retain currently loaded messages on fetch failure
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
    }, [loadMessages])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMessages();
    } finally {
      setRefreshing(false);
    }
  };

  const unreadCount = useMemo(
    () => messages.filter((message) => !message.read).length,
    [messages]
  );

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
    });
  };

  const formatFullTimestamp = (date: Date) =>
    date.toLocaleString("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const markAllAsRead = () => {
    setMessages((prev) =>
      prev.map((message) => ({
        ...message,
        read: true,
      }))
    );

    if (selectedMessage) {
      setSelectedMessage({
        ...selectedMessage,
        read: true,
      });
    }

    // Mark all unread messages in backend
    messages
      .filter((m) => !m.read)
      .forEach((m) => {
        void markMessageAsRead(m.id).catch(() => {});
      });
  };

  const handleMessagePress = (message: Message) => {
    const updatedMessage = {
      ...message,
      read: true,
    };

    setSelectedMessage(updatedMessage);
    setModalVisible(true);

    if (!message.read) {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? updatedMessage
            : item
        )
      );

      void markMessageAsRead(message.id).catch(() => {});
    }
  };

  const handleToggleSelectedRead = () => {
    if (!selectedMessage) return;

    const newReadState = !selectedMessage.read;

    setMessages((prev) =>
      prev.map((item) =>
        item.id === selectedMessage.id
          ? {
              ...item,
              read: newReadState,
            }
          : item
      )
    );

    setSelectedMessage({
      ...selectedMessage,
      read: newReadState,
    });
  };

  const renderItem = ({
    item,
  }: {
    item: Message;
  }) => {
    const meta = getMessageMeta(item.title);

    return (
      <TouchableOpacity
        style={[
          styles.messageRow,
          !item.read && styles.unreadRow,
        ]}
        activeOpacity={0.7}
        onPress={() => handleMessagePress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${
          item.read ? "Read" : "Unread"
        }`}
      >
        <View
          style={[
            styles.messageIcon,
            { backgroundColor: meta.bg },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={21}
            color={meta.color}
          />
        </View>

        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text
              style={[
                styles.messageTitle,
                !item.read &&
                  styles.unreadMessageTitle,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>

          <Text
            style={[
              styles.messagePreview,
              !item.read &&
                styles.unreadMessagePreview,
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        </View>

        <View style={styles.messageRight}>
          {!item.read && (
            <View style={styles.unreadDot} />
          )}

          <Ionicons
            name="chevron-forward"
            size={15}
            color={colors.textSub}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PURPLE}
      />

      {/* PURPLE HEADER */}

      <View style={styles.header}>
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={WHITE}
            />
          </TouchableOpacity>

          <Text style={styles.appBarTitle}>
            Messages
          </Text>

          <TouchableOpacity
            style={[
              styles.markAllButton,
              unreadCount === 0 &&
                styles.markAllButtonDisabled,
            ]}
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mark all messages as read"
          >
            <Ionicons
              name="checkmark-done-outline"
              size={20}
              color={WHITE}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            INBOX
          </Text>

          <Text style={styles.headerHeading}>
            Your messages
          </Text>

          <Text style={styles.headerDescription}>
            Account updates, payment alerts and
            important security notices.
          </Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.headerFooter}>
          <View style={styles.headerFooterIcon}>
            <Ionicons
              name="mail-outline"
              size={16}
              color="#E4E1FF"
            />
          </View>

          <Text style={styles.headerFooterText}>
            {unreadCount === 0
              ? "You're all caught up"
              : `${unreadCount} unread ${
                  unreadCount === 1
                    ? "message"
                    : "messages"
                }`}
          </Text>
        </View>
      </View>

      {/* MESSAGE LIST */}

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Recent messages
            </Text>

            <Text style={styles.sectionDescription}>
              Tap a message to read the full update.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {messages.length}
            </Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[PURPLE]}
              tintColor={PURPLE}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 &&
              styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="mail-open-outline"
                  size={28}
                  color={PURPLE}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No messages
              </Text>

              <Text style={styles.emptyDescription}>
                New account updates and notifications
                will appear here.
              </Text>
            </View>
          }
        />
      </View>

      {/* MESSAGE DETAIL BOTTOM SHEET */}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        statusBarTranslucent
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() =>
              setModalVisible(false)
            }
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {selectedMessage && (() => {
              const meta = getMessageMeta(
                selectedMessage.title
              );

              return (
                <>
                  <View style={styles.modalHeader}>
                    <View
                      style={[
                        styles.modalIcon,
                        {
                          backgroundColor: meta.bg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={23}
                        color={meta.color}
                      />
                    </View>

                    <View style={styles.modalTitleGroup}>
                      <Text style={styles.modalEyebrow}>
                        MESSAGE
                      </Text>

                      <Text style={styles.modalTitle}>
                        {selectedMessage.title}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.modalClose}
                      onPress={() =>
                        setModalVisible(false)
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Close message"
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={colors.navy}
                      />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={
                      styles.modalScrollContent
                    }
                  >
                    <View style={styles.modalDateRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.textSub}
                      />

                      <Text style={styles.modalTimestamp}>
                        {formatFullTimestamp(
                          selectedMessage.timestamp
                        )}
                      </Text>
                    </View>

                    <View style={styles.modalDivider} />

                    <Text style={styles.modalBody}>
                      {selectedMessage.body}
                    </Text>

                    <View style={styles.modalDivider} />

                    <TouchableOpacity
                      style={styles.readToggle}
                      onPress={handleToggleSelectedRead}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <View style={styles.readToggleIcon}>
                        <Ionicons
                          name={
                            selectedMessage.read
                              ? "mail-unread-outline"
                              : "checkmark-circle-outline"
                          }
                          size={19}
                          color={PURPLE}
                        />
                      </View>

                      <View style={styles.readToggleTextGroup}>
                        <Text style={styles.readToggleTitle}>
                          {selectedMessage.read
                            ? "Mark as unread"
                            : "Mark as read"}
                        </Text>

                        <Text style={styles.readToggleDescription}>
                          {selectedMessage.read
                            ? "Keep this message highlighted in your inbox."
                            : "Remove the unread indicator from this message."}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textSub}
                      />
                    </TouchableOpacity>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // HEADER

  header: {
    backgroundColor: PURPLE,
  },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight ?? 24) + 8
        : 56,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },

  appBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: WHITE,
    textAlign: "center",
  },

  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  markAllButtonDisabled: {
    opacity: 0.45,
  },

  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },

  headerEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E4E1FF",
    letterSpacing: 0.7,
    marginBottom: 10,
  },

  headerHeading: {
    fontSize: 29,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.6,
    lineHeight: 36,
  },

  headerDescription: {
    fontSize: 13,
    color: "#E4E1FF",
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 310,
  },

  headerDivider: {
    height: 1,
    backgroundColor:
      "rgba(255,255,255,0.20)",
    marginHorizontal: 24,
  },

  headerFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },

  headerFooterIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerFooterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#E4E1FF",
  },

  // CONTENT

  content: {
    flex: 1,
    backgroundColor: WHITE,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.3,
  },

  sectionDescription: {
    fontSize: 12,
    color: colors.textSub,
    marginTop: 5,
  },

  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },

  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSub,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  // MESSAGE ROWS

  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 92,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 12,
  },

  unreadRow: {
    backgroundColor: "#FCFBFF",
  },

  messageIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  messageContent: {
    flex: 1,
    minWidth: 0,
  },

  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  messageTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },

  unreadMessageTitle: {
    fontWeight: "800",
  },

  timestamp: {
    fontSize: 10,
    color: colors.textSub,
  },

  messagePreview: {
    fontSize: 12,
    color: colors.textSub,
    lineHeight: 18,
    marginTop: 5,
  },

  unreadMessagePreview: {
    color: colors.navy,
  },

  messageRight: {
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    gap: 9,
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // EMPTY STATE

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },

  emptyDescription: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },

  // MESSAGE DETAIL SHEET

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor:
      "rgba(15,23,42,0.52)",
  },

  modalContent: {
    maxHeight: "78%",
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },

  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: LINE,
    alignSelf: "center",
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },

  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitleGroup: {
    flex: 1,
    minWidth: 0,
  },

  modalEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSub,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
    lineHeight: 22,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },

  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },

  modalDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  modalTimestamp: {
    fontSize: 11,
    color: colors.textSub,
  },

  modalDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 18,
  },

  modalBody: {
    fontSize: 14,
    color: colors.navy,
    lineHeight: 22,
  },

  readToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  readToggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PALE_PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  readToggleTextGroup: {
    flex: 1,
    minWidth: 0,
  },

  readToggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },

  readToggleDescription: {
    fontSize: 11,
    color: colors.textSub,
    lineHeight: 16,
    marginTop: 3,
  },
});
