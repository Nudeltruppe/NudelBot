installation:
	
	#install and load nvm
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

	export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
	[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

	#install nodejs
	nvm install 16
	
	#install all modules
	npm install

running:
	#compile the typescript files
	npm run tsc 

	#start the node process
	node .

extra information:
	#to run tsc in watch mode
	npm run tsc-watch

	#information about the bot
	the bot currently only loads the discord and web subsystems.
	the bot has some commands that i think are cool to have.
	the branding is changed from thebot to nudelbot.