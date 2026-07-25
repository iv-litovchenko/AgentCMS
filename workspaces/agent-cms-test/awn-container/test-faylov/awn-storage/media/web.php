<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Guest\LoginController;
use App\Http\Controllers\Guest\RegisterController;
use App\Http\Controllers\Guest\ForgotPasswordController;
use App\Http\Controllers\Guest\ResetPasswordController;

// panel
use App\Http\Controllers\Auth\Panel\MainController;
use App\Http\Controllers\Auth\Panel\AccountsController;
use App\Http\Controllers\Auth\Panel\CategoriesController;
use App\Http\Controllers\Auth\Panel\TgMessagesController;
use App\Http\Controllers\Auth\Panel\TgMessagesSuppliersController;
use App\Http\Controllers\Auth\Panel\HistoryController;

use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\SupportController;
use App\Http\Controllers\Auth\TestingController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\HomeAuthController;
use App\Http\Controllers\Auth\StatisticsController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\HelpController;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Process as LaravelProcess;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;

// ajax
use App\Http\Controllers\Auth\AjaxBox\CoursesController;
use App\Http\Controllers\Auth\AjaxBox\AccBalanceController;
use App\Http\Controllers\Auth\AjaxBox\TradeFormController;
use App\Http\Controllers\Auth\AjaxBox\TradeTableController;
use App\Http\Controllers\Auth\AjaxBox\TradePositionController;
use App\Http\Controllers\Auth\AjaxBox\TgMessageController;
use App\Http\Controllers\Auth\AjaxBox\TestConnectController;
use App\Http\Controllers\Auth\AjaxBox\StatisticController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

//Route::get('/', function () {
//    return view('welcome');
//});

// class DeploymentController extends Controller
// public function deploy() { }
Route::match(['get', 'post'], '/deploy/{pass}', function (Request $request, $pass = '') {

    // $request->input('pass')
    if($pass != '333') {
        abort(403);
    }

    Config::set('app.debug', true); // deploy
    Config::set('app.env', 'local');

    // use Illuminate\Support\Facades\Process;
//    $result = Process::run('
//
//    pwd
//    git --git-dir=../.git --work-tree=../ status
//
//    ');
//
//    return $result->output();

    // 'PHP_PATH' => getenv('DEPLOY_PHP_PATH', 'php'),
    // 'BRANCH' => getenv('DEPLOY_GIT_BRANCH', 'main')
    $scriptPath = base_path('.bash/deploy-cicd.sh');
    $result = LaravelProcess::run(File::get($scriptPath));

    //  Let's check if the script was executed successfully
    if (!$result->successful()) {

        // If the execution failed, let's throw the error
        // throw new ProcessFailedException($result);
    }

    //  Otherwise let's return the output response
    return nl2br($result->output());

})->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class])->name('deploy');

Route::middleware('guest')->group(function () {
    // Регистрация
    Route::get('register', [RegisterController::class, 'showRegistrationForm'])->name('route.cab.register');
    Route::post('register', [RegisterController::class, 'submit'])->name('route.cab.register.submit');

    // Вход (AuthenticatedSessionController->create & ->store)
    Route::get('login', [LoginController::class, 'showLoginForm'])->name('route.cab.login');
    Route::post('login', [LoginController::class, 'login'])->name('route.cab.login.submit');

    // Сброс пароля
    // Не правильно назвал - это "forgot-password"
    Route::get('password/reset', [ForgotPasswordController::class, 'showResetForm'])->name('route.cab.forgot-password');
    Route::post('password/email', [ForgotPasswordController::class, 'sendResetLinkEmail'])->name('route.cab.forgot-password.submit');

    // +++ забыли пароль (форма / отправить)
    // Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request'); // забыли пароль (форма)
    // Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email'); // забыли пароль (отправить)

    // +++ пеереход из письма сброс пароля (форма и отправить)
    // Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    // Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store’);

    // другой вариант названия
    // Route::get('password/reset/{token}', [ResetPasswordController::class, 'showResetForm'])->name('route.cab.password.reset');
    // Route::post('password/reset', [ResetPasswordController::class, 'reset'])->name('route.cab.password.update');
});

Route::middleware('auth')->group(function () {

    // ??? зачем их три?
    // Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');
    // Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    // Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])->middleware('throttle:6,1')->name('verification.send');

    //  ????
    // Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])->name('password.confirm');
    // Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    // ??? (так понимаю это изменение пароля)
    // Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    // Выход
    // AuthenticatedSessionController::class, 'destroy'
    Route::get('logout', [LogoutController::class, 'logout'])->name('route.cab.logout.submit');
});

// Панель управления
Route::get('panel', [MainController::class, 'index'])->name('route.cab.panel');
Route::get('panel/logs', [MainController::class, 'logs'])->name('route.cab.panel.logs');
Route::get('panel/exchanges', [MainController::class, 'exchangesIndex'])->name('route.cab.panel.exchanges');
Route::get('panel/tokens', [MainController::class, 'tokensIndex'])->name('route.cab.panel.tokens');

// Панель управления > аккаунты
Route::get('panel/accounts', [AccountsController::class, 'accountsIndex'])->name('route.cab.panel.accounts');

Route::get('panel/accounts/create', [AccountsController::class, 'accountShowFormCreate'])->name('route.cab.panel.accounts.create');
Route::post('panel/accounts/create/submit', [AccountsController::class, 'accountCreate'])->name('route.cab.panel.accounts.create.submit');

Route::get('panel/accounts/update/{account}', [AccountsController::class, 'accountShowFormUpdate'])->name('route.cab.panel.accounts.update');
Route::post('panel/accounts/update/submit/{account}', [AccountsController::class, 'accountUpdate'])->name('route.cab.panel.accounts.update.submit');

Route::get('panel/accounts/delete/{account}', [AccountsController::class, 'accountShowFormDelete'])->name('route.cab.panel.accounts.delete');
Route::post('panel/accounts/delete/submit/{account}', [AccountsController::class, 'accountDelete'])->name('route.cab.panel.accounts.delete.submit');

Route::post('panel/accounts/change/submit', [AccountsController::class, 'accountChange'])->name('route.cab.panel.accounts.change.submit');

// Панель управления > категории
Route::get('panel/categories', [CategoriesController::class, 'categoriesIndex'])->name('route.cab.panel.categories');
Route::get('panel/categories/create', [CategoriesController::class, 'categoryShowFormCreate'])->name('route.cab.panel.categories.create');
Route::post('panel/categories/create/submit', [CategoriesController::class, 'categoryCreate'])->name('route.cab.panel.categories.create.submit');

Route::get('panel/categories/update/{category}', [CategoriesController::class, 'categoryShowFormUpdate'])->name('route.cab.panel.categories.update');
Route::post('panel/categories/update/submit/{category}', [CategoriesController::class, 'categoryUpdate'])->name('route.cab.panel.categories.update.submit');

Route::get('panel/categories/delete/{category}', [CategoriesController::class, 'categoryShowFormDelete'])->name('route.cab.panel.categories.delete');
Route::post('panel/categories/delete/submit/{category}', [CategoriesController::class, 'categoryDelete'])->name('route.cab.panel.categories.delete.submit');

// Панель управления > загруженная история
Route::get('panel/history', [HistoryController::class, 'historyIndex'])->name('route.cab.panel.history');

// Панель управления > телеграмм сообщения
Route::get('panel/telegram', [TgMessagesController::class, 'tgMessages'])->name('route.cab.panel.tgmessages');
Route::post('panel/telegram/create', [TgMessagesController::class, 'tgMessageCreate'])->name('route.cab.panel.tgmessage.create.submit');

Route::get('panel/telegram/update/{tgMessage}', [TgMessagesController::class, 'tgMessageShowFormUpdate'])->name('route.cab.panel.tgmessage.update');
Route::post('panel/telegram/update/submit/{tgMessage}', [TgMessagesController::class, 'tgMessageUpdate'])->name('route.cab.panel.tgmessage.update.submit');

Route::get('panel/telegram/delete/{tgMessage}', [TgMessagesController::class, 'tgMessageShowFormDelete'])->name('route.cab.panel.tgmessage.delete');
Route::post('panel/telegram/delete/submit/{tgMessage}', [TgMessagesController::class, 'tgMessageDelete'])->name('route.cab.panel.tgmessage.delete.submit');

// Поддержка & Профиль
Route::get('support', SupportController::class)->name('route.cab.support');
Route::get('profile', [ProfileController::class, 'showProfileForm'])->name('route.cab.profile');
Route::post('profile', [ProfileController::class, 'update'])->name('route.cab.profile.submit');

// Главная страница
Route::get('/', HomeController::class)->name('route.home');
Route::get('suppliers', [TgMessagesSuppliersController::class, 'TgMessagesSuppliers'])->name('route.tgmessagessuppliers');
Route::get('suppliers/{id}', [TgMessagesSuppliersController::class, 'TgMessagesSupplierDetail'])->name('route.tgmessagessuppliers.detail');
Route::post('suppliers-forwards/{id}', [TgMessagesSuppliersController::class, 'TgMessagesSupplierForwards'])->name('route.tgmessagessuppliers.forwards');
Route::get('testing', TestingController::class)->name('route.testing');
Route::get('statistics', StatisticsController::class)->name('route.statistics');
Route::get('statistics/show/{type}/{filter?}', [StatisticsController::class, 'show'])->name('route.statistics.show');

Route::get('analytics', AnalyticsController::class)->name('route.analytics');
Route::get('help', HelpController::class)->name('route.help');

// Ajax-блоки
Route::post('ajax/testing/liveupdate/{tgMessage}', [TgMessagesController::class, 'tgMessageAjaxLiveUpdate']);
Route::get('ajax/testing/{signalId}/{signalNumber}', [TestingController::class, 'go']);

Route::get('ajax/testconnect/{account}', TestConnectController::class);
Route::get('ajax/box/courses', CoursesController::class);
Route::get('ajax/box/accbalance', AccBalanceController::class);
Route::get('ajax/box/tradeform', [TradeFormController::class, 'showTradeForm']);
Route::post('ajax/box/tradeform', [TradeFormController::class, 'submitTradeForm']);
Route::get('ajax/box/tradetable', [TradeTableController::class, 'showTradeTable']);
Route::get('ajax/box/tgmessage', TgMessageController::class);

Route::get('ajax/box/accounts', [StatisticController::class, 'accounts']);
Route::get('ajax/box/categoriesandtggroups', [StatisticController::class, 'categoriesAndTgGroups']);
Route::get('ajax/box/date', [StatisticController::class, 'date']);
Route::get('ajax/box/tickers', [StatisticController::class, 'tickers']);
Route::get('ajax/box/trades', [StatisticController::class, 'trades']);
Route::get('ajax/box/trade/view/{result}', [StatisticController::class, 'tradeView'])->name('route.ajax.box.trade.view');

// Редактировование и управление позицией
Route::get('ajax/box/trade/order/limit/{orderId}', [TradePositionController::class, 'orderLimitShowFormUpdate'])->name('route.ajax.box.trade.order.limit.update');
Route::post('ajax/box/trade/order/limit/submit/{orderId}', [TradePositionController::class, 'orderLimitUpdate'])->name('route.ajax.box.trade.order.limit.update.submit');

Route::get('ajax/box/trade/position/{result}', [TradePositionController::class, 'resultShowFormUpdate'])->name('route.ajax.box.trade.position.update');
Route::post('ajax/box/trade/position/submit/{result}', [TradePositionController::class, 'resultUpdate'])->name('route.ajax.box.trade.position.update.submit');