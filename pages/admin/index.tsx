import classNames from "classnames";
import { FC, useCallback, useEffect, useState } from "react";
import Layout from "../../components/Layout";
import Tab from "../../components/TabLayout/Tab";
import TabLayout from "../../components/TabLayout/TabLayout";
import { Message } from "../../lib/messages/common";
import { Icon } from "@mdi/react"
import { mdiArrowDown, mdiArrowUp, mdiCheckboxBlankOutline, mdiCheckboxMarkedOutline } from "@mdi/js";
import { NextPageContext } from "next";
import { authenticate } from "../../lib/auth";

interface ListItemProps {
	message: Message,
	checked: boolean
	setChecked: (val: boolean) => void
}

const ListItem: FC<ListItemProps> = ({ message, checked, setChecked }) => {
	const [open, setOpen] = useState(false)

	const toggleOpen = useCallback(() => setOpen(!open), [open])
	const toggleChecked = useCallback(() => setChecked(!checked), [checked, setChecked])

	return (
		<li className="flex flex-col gap-2 border-default py-4">
			<div className="flex gap-2 px-2">
				<button onClick={toggleChecked} className="flex translate-y-[1.1px]"><Icon path={checked ? mdiCheckboxMarkedOutline : mdiCheckboxBlankOutline} size={0.7} /></button>
				<div className="text-left grid grid-cols-2 gap-y-2 justify-items-start text-sm">
					<div className="flex flex-col gap-1">
						<h3 className="">{message.senderName}</h3>
						<span>{message.senderEmail}</span>
					</div>
					<div className="justify-self-end">{message.date.toLocaleDateString()}</div>
					<h4 className={classNames('inline-block w-full col-span-2 text-lg', { 'text-ellipsis overflow-hidden whitespace-nowrap': !open })}>{message.subject} Lorem ipsum dolor sit amet consectetur adipisicing elit. Accusantium temporibus quos magni harum! Quam error nam beatae quidem eius maiores eaque enim commodi sint sequi corrupti est sit dolores quisquam quo odio, excepturi fugiat porro aspernatur asperiores distinctio labore deserunt voluptatum. Sint atque beatae repellat odio cum, iusto id dignissimos.</h4>
					<div className={classNames('mt-4 mb-8 col-span-2', { 'block': open }, { 'hidden': !open })}>
						<div>{message.message}</div>
					</div>
				</div>
			</div>
			<button className="flex justify-center w-full col-span-2" onClick={toggleOpen}>
				<Icon path={open ? mdiArrowUp : mdiArrowDown} size={1} />
			</button>
		</li>
	)
}

export default function Admin({ authenticated }: { authenticated: boolean }) {
	const [messages, setMessages] = useState<Message[]>([])
	const [checkedMessages, setCheckedMessages] = useState<boolean[]>([])
	const [numChecked, setNumChecked] = useState(0)

	useEffect(() => {
		if (authenticated) {
			fetch('/api/messages/', { mode: 'cors' }).then(async (res) => {
				if (res.ok) {
					const json = await res.json()
					setMessages(json.map((message: any) => (
						new Message(message.senderName, message.senderEmail, message.subject, message.message, new Date(message.date), message.rowid
						))))
				}
			})
		}
	}, [authenticated])

	const createSetter = useCallback((i: number) => (val: boolean) => {
		const newCheckedMessages = [...checkedMessages]
		newCheckedMessages[i] = val
		setCheckedMessages(newCheckedMessages)
	}, [checkedMessages])

	const toggleAllChecked = useCallback(() => {
		if (messages.length === 0 && checkedMessages !== []) {
			setCheckedMessages([])
		} else if (numChecked < messages.length) {
			setCheckedMessages(Array(messages.length).fill(true))
		} else {
			setCheckedMessages(Array(messages.length).fill(false))
		}
	}, [messages, numChecked, checkedMessages])

	const deleteSelected = useCallback(() => {
		const rowids: number[] = []
		const newMessages: Message[] = []

		for (let i = 0; i < messages.length; i++) {
			if (checkedMessages[i]) {
				const rowid = messages[i].rowid
				if (rowid) {
					rowids.push(rowid)
				} else {
					// Show some error, rowid should not be undefined
				}
			} else {
				newMessages.push(messages[i])
			}
		}

		fetch('/api/messages', { method: 'DELETE', body: JSON.stringify(rowids),  mode: 'cors' }).then(res => {
			if (!res.ok) {
				// show some error message
				return;
			}

			setCheckedMessages([])
			setMessages(newMessages)
		})
	}, [checkedMessages, messages])

	useEffect(() => {
		// Count the number of checked messages
		setNumChecked(checkedMessages.filter(m => m).length)
	}, [checkedMessages])

	if (!authenticated) {
		return (
			<>
				<Layout title="Admin">
					<h2 className="text-4xl mt-8">401 - Unauthorized</h2>
				</Layout>
			</>
		)
	}

	return (
		<>
			<Layout title="Admin">
				<TabLayout>
					<Tab displayName="Messages">
						<div className="flex flex-col gap-4">
							<div className="flex justify-between">
								<button onClick={toggleAllChecked} className="flex items-center gap-1">
									<Icon className="translate-y-[1.1px]" path={((messages.length === 0) || (numChecked < messages.length)) ? mdiCheckboxBlankOutline : mdiCheckboxMarkedOutline} size={0.7} />
									<span className="italic underline">Select All messages</span>
								</button>
								{
									numChecked > 0 &&
									<div className="flex gap-2 items-center">
										<button onClick={deleteSelected} className="italic underline">Delete <span className="font-bold">{numChecked}</span> messages selected</button>
									</div>
								}
							</div>
							<ol className="flex flex-col gap-6">
								{messages.map((message, i) => (
									<ListItem key={i} message={message} checked={checkedMessages[i]} setChecked={createSetter(i)} />
								))}
							</ol>
						</div>
					</Tab>
					<Tab displayName="Posts">
					</Tab>
				</TabLayout>
			</Layout>
		</>
	)
}

export function getServerSideProps(context: NextPageContext) {
	const { req, res } = context;
	let authenticated = false
	if (req && res) {
		authenticated = authenticate(req)

		if (!authenticated) {
			res.statusCode = 401
			res.setHeader('WWW-Authenticate', 'Basic')
		}
	}


	return {
		props: {
			authenticated
		}
	}
}
