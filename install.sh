#!/usr/bin/env bash

REPO_URL="https://github.com/NiRBES02/wisteriamc.git"

PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
GREEN='\033[0;32m'
NC='\033[0m'
BOLD='\033[1m'

tput civvis 2>/dev/null || printf "\033[?25l"

LOG_GIT=$(mktemp)
LOG_NODE=$(mktemp)
LOG_PNPM=$(mktemp)

cleanup() {
    tput cnorm 2>/dev/null || printf "\033[?25h"
    [[ -n "$PID_GIT" ]] && kill $PID_GIT 2>/dev/null
    [[ -n "$PID_NODE" ]] && kill $PID_NODE 2>/dev/null
    [[ -n "$PID_PNPM" ]] && kill $PID_PNPM 2>/dev/null
    rm -f "$LOG_GIT" "$LOG_NODE" "$LOG_PNPM"
    printf "\n${NC}Процесс прерван.\n"
    exit 1
}
trap cleanup INT TERM

render_line() {
    local percent=$1
    local label=$2
    local status=$3
    
    if [ "$status" = "WAIT" ]; then
        printf "  %-25s > ${GRAY}WAIT${NC}" "$label"
    elif [ $percent -ge 100 ]; then
        printf "  %-25s > ${GRAY}IDLE${NC}" "$label"
    else
        local width=20
        local filled=$(( percent * width / 100 ))
        local empty=$(( width - filled ))
        
        local bar=""
        for ((i=0; i<filled; i++)); do bar+="═"; done
        local spaces=""
        for ((i=0; i<empty; i++)); do spaces+=" ";   done
        
        printf "  %-25s > ${PURPLE}%3d%%${NC} ▕%b%s${GRAY}%s${NC}▏" \
            "$label" "$percent" "$CYAN" "$bar" "$spaces"
    fi
}

task_git() {
    if [ ! -d ".git" ]; then
        git init >> "$LOG_GIT" 2>&1
        git remote add origin "$REPO_URL" >> "$LOG_GIT" 2>&1
        git fetch origin >> "$LOG_GIT" 2>&1
        git checkout -f origin/main >> "$LOG_GIT" 2>&1 || git checkout -f origin/master >> "$LOG_GIT" 2>&1
    else
        echo "Репозиторий уже установлен." >> "$LOG_GIT"
    fi
    echo "DONE" >> "$LOG_GIT"
}

task_node() {
    while kill -0 $PID_GIT 2>/dev/null; do sleep 0.2; done

    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        if command -v apt &> /dev/null; then
            apt-get update -y > "$LOG_NODE" 2>&1
            apt-get install -y nodejs npm > "$LOG_NODE" 2>&1
        elif command -v pacman &> /dev/null; then
            pacman -Sy --noconfirm nodejs npm > "$LOG_NODE" 2>&1
        else
            exit 1
        fi
    fi
    echo "DONE" >> "$LOG_NODE"
}

task_pnpm() {
    while kill -0 $PID_GIT 2>/dev/null; do sleep 0.2; done
    while kill -0 $PID_NODE 2>/dev/null; do sleep 0.2; done

    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm > "$LOG_PNPM" 2>&1
    fi
    echo "DONE" >> "$LOG_PNPM"
}

printf "${BOLD}${PURPLE}> Building project :initialization...${NC}\n"
printf "${GRAY}Последовательная конфигурация окружения Wisteria${NC}\n"

printf "\n\n\n"

task_git & PID_GIT=$!
task_node & PID_NODE=$!
task_pnpm & PID_PNPM=$!

p1=0; p2=0; p3=0
status1="RUN"; status2="WAIT"; status3="WAIT"
start_time=$SECONDS

while [ $p1 -lt 100 ] || [ $p2 -lt 100 ] || [ $p3 -lt 100 ]; do
    
    if [ $p1 -lt 100 ]; then
        if ! kill -0 $PID_GIT 2>/dev/null; then
            p1=100; status1="IDLE"; status2="RUN"
        else
            [ $p1 -lt 90 ] && p1=$((p1 + 4))
        fi
    fi

    if [ $p2 -lt 100 ] && [ "$status2" = "RUN" ]; then
        if ! kill -0 $PID_NODE 2>/dev/null; then
            p2=100; status2="IDLE"; status3="RUN"
        else
            [ $p2 -lt 90 ] && p2=$((p2 + 2))
        fi
    fi

    if [ $p3 -lt 100 ] && [ "$status3" = "RUN" ]; then
        if ! kill -0 $PID_PNPM 2>/dev/null; then
            p3=100; status3="IDLE"
        else
            [ $p3 -lt 90 ] && p3=$((p3 + 5))
        fi
    fi

    line1=$(render_line $p1 ":env:git-clone" "$status1")
    line2=$(render_line $p2 ":env:nodejs-runtime" "$status2")
    line3=$(render_line $p3 ":env:pnpm-package-manager" "$status3")

    printf "\033[3A\033[K%b\n\033[K%b\n\033[K%b\n" "$line1" "$line2" "$line3"

    sleep 0.08
done

tput cnorm 2>/dev/null || printf "\033[?25h"

elapsed=$(( SECONDS - start_time ))
printf "\n${GREEN}${BOLD}BUILD SUCCESSFUL${NC} in ${elapsed}s\n"

rm -f "$LOG_GIT" "$LOG_NODE" "$LOG_PNPM"

printf "\n${PURPLE}${BOLD}> Выполнение команд...${NC}\n"

printf "${CYAN}[1/2]${NC} Установка зависимостей проекта "

pnpm install > /dev/null 2>&1 &
PID_PNPM_INS=$!

while kill -0 $PID_PNPM_INS 2>/dev/null; do
    printf "${PURPLE}.${NC}"
    sleep 0.4
done
printf "\n  ${GREEN}✓${NC} Зависимости успешно синхронизированы\n"

printf "${CYAN}[2/2]${NC} Конфигурация окружения (.env)...\n"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp ".env.example" ".env"
        printf "  ${GREEN}✓${NC} Файл .env успешно создан из .env.example\n"
    else
        printf "  ${GRAY}! Предупреждение: .env.example не найден${NC}\n"
    fi
else
    printf "  ${GRAY}✓ Файл .env уже существует, пропускаем${NC}\n"
fi

printf "\n${GREEN}${BOLD}Подготовка Wisteria завершена!${NC}\n"
sleep 2 

printf "${PURPLE}Запускаю основное приложение...${NC}\n\n"
sleep 1

npm run app
