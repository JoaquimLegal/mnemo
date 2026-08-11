Output demo.gif
Set Theme "Dracula"
Set FontSize 20
Set Width 1150
Set Height 620
Set Padding 36
Set Framerate 10
Set TypingSpeed 60ms
Set Shell "bash"

Type "PS1='$ '"
Enter
Sleep 500ms

Type "mm init"
Enter
Sleep 700ms

Type "mm new 'We chose Postgres' --body 'over Mongo, because of transactions' --tags decision,db --importance 0.9"
Enter
Sleep 900ms

Type "mm new 'User prefers tabs' --body 'two-space indent, tabs in Makefiles' --tags preference --importance 0.6"
Enter
Sleep 900ms

Type "mm ls"
Enter
Sleep 700ms

Type "mm search 'postgres decision'"
Enter
Sleep 1400ms

Type "mm log"
Enter
Sleep 1000ms

Type "mm undo"
Enter
Sleep 800ms

Type "mm branch experiment"
Enter
Sleep 700ms

Type "mm new 'try sqlite instead' --importance 0.4 --type episodic"
Enter
Sleep 700ms

Type "mm switch main"
Enter
Sleep 700ms

Type "mm snapshot v1"
Enter
Sleep 1000ms

Type "echo '# an agent's memory is just a git repo'"
Enter
Sleep 1000ms
